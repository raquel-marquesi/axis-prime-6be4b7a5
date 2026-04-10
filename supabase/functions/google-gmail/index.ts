import { createClient } from "npm:@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ body?: { data?: string }; mimeType?: string }>;
  };
  internalDate?: string;
}

async function getAccessToken(credentials: ServiceAccountCredentials, userEmail: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  // Fix private key newlines that may be escaped
  const privateKeyPem = credentials.private_key.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(privateKeyPem, "RS256");
  
  const jwt = await new SignJWT({
    iss: credentials.client_email,
    sub: userEmail, // Domain-Wide Delegation: impersonate this user
    scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(privateKey);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenResponse.ok) {
    console.error("Token error:", tokenData);
    throw new Error(`Failed to get access token: ${tokenData.error_description || tokenData.error}`);
  }

  return tokenData.access_token;
}

async function listMessages(accessToken: string, query?: string, maxResults = 50): Promise<GmailMessage[]> {
  const params = new URLSearchParams({ maxResults: maxResults.toString() });
  if (query) params.append("q", query);

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("List messages error:", data);
    throw new Error(`Failed to list messages: ${data.error?.message || "Unknown error"}`);
  }

  return data.messages || [];
}

async function getMessage(accessToken: string, messageId: string): Promise<GmailMessage> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Get message error:", data);
    throw new Error(`Failed to get message: ${data.error?.message || "Unknown error"}`);
  }

  return data;
}

async function sendMessage(accessToken: string, to: string, subject: string, body: string, from?: string): Promise<any> {
  const emailLines = [
    `To: ${to}`,
    from ? `From: ${from}` : "",
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    body,
  ].filter(Boolean);

  const email = emailLines.join("\r\n");
  const encodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedEmail }),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Send message error:", data);
    throw new Error(`Failed to send message: ${data.error?.message || "Unknown error"}`);
  }

  return data;
}

function parseEmailHeaders(message: GmailMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  message.payload?.headers?.forEach((header) => {
    headers[header.name.toLowerCase()] = header.value;
  });
  return headers;
}

function decodeBase64(data: string): string {
  try {
    const decoded = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
    return decodeURIComponent(escape(decoded));
  } catch {
    return data;
  }
}

function getEmailBody(message: GmailMessage): string {
  if (message.payload?.body?.data) {
    return decodeBase64(message.payload.body.data);
  }
  
  const textPart = message.payload?.parts?.find(
    (part) => part.mimeType === "text/plain" || part.mimeType === "text/html"
  );
  
  if (textPart?.body?.data) {
    return decodeBase64(textPart.body.data);
  }
  
  return "";
}

// Add label to message to mark as processed
async function addLabelToMessage(accessToken: string, messageId: string, labelName: string): Promise<void> {
  try {
    // First, try to find or create the label
    const labelsResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/labels",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const labelsData = await labelsResponse.json();
    
    let labelId = labelsData.labels?.find((l: any) => l.name === labelName)?.id;
    
    if (!labelId) {
      // Create the label
      const createResponse = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/labels",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: labelName }),
        }
      );
      const createData = await createResponse.json();
      labelId = createData.id;
    }
    
    if (labelId) {
      await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ addLabelIds: [labelId] }),
        }
      );
    }
  } catch (error) {
    console.error("Error adding label:", error);
  }
}

// Extract CNJ number from text
function extractCNJFromText(text: string): string | null {
  // CNJ format: 0001234-56.2024.5.02.0001
  const cnjPattern = /\d{7}-\d{2}\.\d{4}\.\d{1,2}\.\d{2}\.\d{4}/;
  const match = text.match(cnjPattern);
  return match ? match[0] : null;
}

// Extract email address from "From" header
function extractEmailAddress(from: string): string {
  const emailMatch = from.match(/<([^>]+)>/);
  return emailMatch ? emailMatch[1].toLowerCase() : from.toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseKey;

    if (!isServiceRole) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
      
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse request
    const { action, userEmail, query, messageId, to, subject, body, maxResults, markAsProcessed, labelFilter, customQuery, addLabels, removeLabels } = await req.json();

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "userEmail is required for Domain-Wide Delegation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get service account credentials
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
    }

    console.log("Service Account JSON length:", serviceAccountJson.length);
    
    let credentials: ServiceAccountCredentials;
    try {
      credentials = JSON.parse(serviceAccountJson);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON format");
    }

    if (!credentials.private_key) {
      console.error("Credentials keys:", Object.keys(credentials));
      throw new Error("private_key not found in service account JSON");
    }
    
    const accessToken = await getAccessToken(credentials, userEmail);

    console.log(`Gmail action: ${action} for user: ${userEmail}`);

    let result: any;

    switch (action) {
      case "list": {
        const messages = await listMessages(accessToken, query, maxResults || 50);
        result = { messages, count: messages.length };
        break;
      }

      case "get": {
        if (!messageId) {
          return new Response(JSON.stringify({ error: "messageId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const message = await getMessage(accessToken, messageId);
        const headers = parseEmailHeaders(message);
        const emailBody = getEmailBody(message);
        result = {
          id: message.id,
          threadId: message.threadId,
          from: headers.from,
          to: headers.to,
          subject: headers.subject,
          date: headers.date,
          snippet: message.snippet,
          body: emailBody,
        };
        break;
      }

      case "send": {
        if (!to || !subject || !body) {
          return new Response(JSON.stringify({ error: "to, subject, and body are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await sendMessage(accessToken, to, subject, body, userEmail);
        break;
      }

      case "process-inbox": {
        // Process unread emails and create solicitacoes with AI extraction
        const PROCESSED_LABEL = "Axis/Processado";
        const searchQuery = customQuery
          ? `${customQuery} -label:${PROCESSED_LABEL}`
          : labelFilter 
            ? `is:unread label:${labelFilter} -label:${PROCESSED_LABEL}`
            : `is:unread -label:${PROCESSED_LABEL}`;
        
        const messages = await listMessages(accessToken, searchQuery, maxResults || 20);
        console.log(`Found ${messages.length} unread messages to process`);
        
        const createdSolicitacoes: any[] = [];
        const errors: string[] = [];
        
        // Create processing log
        const { data: processingLog } = await supabase
          .from("processing_logs")
          .insert({
            source: "manual",
            started_at: new Date().toISOString(),
            emails_found: messages.length,
          })
          .select()
          .single();
        
        for (const msgRef of messages) {
          try {
            const message = await getMessage(accessToken, msgRef.id);
            const headers = parseEmailHeaders(message);
            const emailBody = getEmailBody(message);
            const fromEmail = extractEmailAddress(headers.from || "");
            
            // ---- AI EXTRACTION ----
            let aiResult: any = null;
            try {
              const extractUrl = `${supabaseUrl}/functions/v1/extract-calculation-data`;
              const extractResponse = await fetch(extractUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  raw_text: emailBody.substring(0, 4000),
                  email_subject: headers.subject,
                  email_from: headers.from,
                }),
              });
              
              if (extractResponse.ok) {
                aiResult = await extractResponse.json();
                console.log(`AI extraction for ${msgRef.id}: confidence=${aiResult.ai_confidence}, type=${aiResult.extraction?.calculation_type}`);
              } else {
                console.error(`AI extraction failed for ${msgRef.id}:`, await extractResponse.text());
              }
            } catch (aiError) {
              console.error(`AI extraction error for ${msgRef.id}:`, aiError);
            }
            
            // ---- CLIENT MATCHING (AI result takes precedence, then fallback to email lookup) ----
            let clientId: string | null = aiResult?.client_id || null;
            
            if (!clientId) {
              const { data: contactData } = await supabase
                .from("client_contacts")
                .select("client_id")
                .ilike("email", fromEmail)
                .limit(1)
                .single();
              
              if (contactData) {
                clientId = contactData.client_id;
              } else {
                const { data: clientData } = await supabase
                  .from("clients")
                  .select("id")
                  .or(`indicacao_email.ilike.${fromEmail}`)
                  .limit(1)
                  .single();
                
                if (clientData) {
                  clientId = clientData.id;
                }
              }
            }
            
            // ---- PROCESS MATCHING (AI CNJ takes precedence) ----
            let processId: string | null = null;
            const cnjFromAI = aiResult?.extraction?.cnj_number;
            const textToSearch = `${headers.subject || ""} ${message.snippet || ""}`;
            const cnjNumber = cnjFromAI || extractCNJFromText(textToSearch);
            
            if (cnjNumber) {
              const { data: processData } = await supabase
                .from("processes")
                .select("id")
                .eq("numero_processo", cnjNumber)
                .limit(1)
                .single();
              
              if (processData) {
                processId = processData.id;
              }
            }
            
            // ---- PRIORITY (AI result takes precedence) ----
            let prioridade: "baixa" | "media" | "alta" | "urgente" = 
              aiResult?.extraction?.urgency || "media";
            
            if (!aiResult?.extraction?.urgency) {
              const subjectLower = (headers.subject || "").toLowerCase();
              if (subjectLower.includes("urgente") || subjectLower.includes("urgent")) {
                prioridade = "urgente";
              } else if (subjectLower.includes("importante") || subjectLower.includes("prioridade")) {
                prioridade = "alta";
              }
            }
            
            // Parse email date
            let emailDate: string | null = null;
            if (message.internalDate) {
              emailDate = new Date(parseInt(message.internalDate)).toISOString();
            } else if (headers.date) {
              try {
                emailDate = new Date(headers.date).toISOString();
              } catch {
                emailDate = null;
              }
            }
            
            // ---- DEADLINE from AI ----
            const dataLimite = aiResult?.extraction?.deadline || null;
            
            // Create solicitacao with AI-enriched data
            const insertData: Record<string, any> = {
              origem: "email",
              email_id: message.id,
              email_from: headers.from,
              email_subject: headers.subject,
              email_snippet: message.snippet?.substring(0, 500),
              email_date: emailDate,
              titulo: headers.subject || "E-mail sem assunto",
              descricao: aiResult?.extraction?.summary || message.snippet,
              client_id: clientId,
              process_id: processId,
              prioridade,
              status: "pendente",
              source_type: "email",
              data_limite: dataLimite,
            };
            
            // Add AI fields if extraction succeeded
            if (aiResult) {
              insertData.calculation_type_id = aiResult.calculation_type_id || null;
              insertData.extracted_details = aiResult.extracted_details || null;
              insertData.ai_confidence = aiResult.ai_confidence || null;
            }
            
            const { data: solicitacao, error: insertError } = await supabase
              .from("solicitacoes")
              .insert(insertData)
              .select()
              .single();
            
            if (insertError) {
              console.error("Error creating solicitacao:", insertError);
              errors.push(`Failed to create for ${message.id}: ${insertError.message}`);
            } else {
              createdSolicitacoes.push(solicitacao);
              
              // ---- CREATE PROCESS DEADLINE + CALENDAR EVENT ----
              if (processId && dataLimite) {
                try {
                  const ocorrencia = aiResult?.extraction?.calculation_type || headers.subject || "Prazo via e-mail";
                  
                  const { data: result, error: rpcError } = await supabase.rpc("core_create_deadline", {
                    payload: {
                      process_id: processId,
                      data_prazo: dataLimite,
                      ocorrencia: ocorrencia.substring(0, 200),
                      detalhes: `Extraído do e-mail: ${headers.subject || "sem assunto"}\nDe: ${headers.from || "desconhecido"}`,
                      assigned_to: solicitacao.assigned_to || null,
                      source: "email"
                    }
                  });
                  
                  if (rpcError || (result && !result.success)) {
                    console.error("Error creating deadline:", rpcError || result?.error);
                  } else if (result && result.id) {
                    console.log(`Created/Updated process_deadline ${result.id} for process ${processId} on ${dataLimite} (Action: ${result.action})`);
                    
                    // Only create event if it was newly inserted
                    if (result.action === "inserted") {
                      // Determine user_id for calendar event: assigned_to or fallback to process creator
                      let eventUserId = solicitacao.assigned_to;
                      if (!eventUserId) {
                        const { data: processData } = await supabase
                          .from("processes")
                          .select("created_by")
                          .eq("id", processId)
                          .single();
                        eventUserId = processData?.created_by;
                      }
                      
                      if (eventUserId) {
                        const deadlineDate = new Date(dataLimite + "T09:00:00");
                        const endDate = new Date(dataLimite + "T18:00:00");
                        
                        const { error: calError } = await supabase
                          .from("calendar_events")
                          .insert({
                            user_id: eventUserId,
                            title: `Prazo: ${ocorrencia.substring(0, 100)}`,
                            description: `Prazo processual extraído de e-mail.\nAssunto: ${headers.subject || ""}\nDe: ${headers.from || ""}`,
                            start_at: deadlineDate.toISOString(),
                            end_at: endDate.toISOString(),
                            all_day: true,
                            event_type: "prazo",
                            process_deadline_id: result.id,
                          });
                        
                        if (calError) {
                          console.error("Error creating calendar event:", calError);
                        } else {
                          console.log(`Created calendar_event for deadline ${result.id}`);
                        }
                      }
                    }
                  }
                } catch (dlError) {
                  console.error("Error in deadline/calendar creation:", dlError);
                }
              }
              
              if (markAsProcessed !== false) {
                await addLabelToMessage(accessToken, message.id, PROCESSED_LABEL);
              }
            }
          } catch (msgError) {
            console.error(`Error processing message ${msgRef.id}:`, msgError);
            errors.push(`Error processing ${msgRef.id}: ${msgError instanceof Error ? msgError.message : "Unknown"}`);
          }
        }
        
        // Update processing log
        if (processingLog) {
          await supabase
            .from("processing_logs")
            .update({
              finished_at: new Date().toISOString(),
              emails_processed: createdSolicitacoes.length,
              errors: errors.length > 0 ? errors : null,
            })
            .eq("id", processingLog.id);
        }
        
        result = {
          processed: messages.length,
          created: createdSolicitacoes.length,
          solicitacoes: createdSolicitacoes,
          errors: errors.length > 0 ? errors : undefined,
        };
        break;
      }

      case "get-message-full": {
        // Returns structured message with plainBody + htmlBody + headers for orchestrators
        if (!messageId) {
          return new Response(JSON.stringify({ error: "messageId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const fullMsg = await getMessage(accessToken, messageId);
        const fullHeaders = parseEmailHeaders(fullMsg);
        
        // Extract plain text and HTML parts
        let plainBody = "";
        let htmlBody = "";
        
        if (fullMsg.payload?.parts) {
          for (const part of fullMsg.payload.parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
              plainBody = decodeBase64(part.body.data);
            } else if (part.mimeType === "text/html" && part.body?.data) {
              htmlBody = decodeBase64(part.body.data);
            }
          }
        }
        if (!plainBody && !htmlBody && fullMsg.payload?.body?.data) {
          const decoded = decodeBase64(fullMsg.payload.body.data);
          // Guess if it's HTML
          if (decoded.includes("<html") || decoded.includes("<div") || decoded.includes("<p")) {
            htmlBody = decoded;
          } else {
            plainBody = decoded;
          }
        }
        
        result = {
          id: fullMsg.id,
          threadId: fullMsg.threadId,
          labelIds: fullMsg.labelIds || [],
          from: fullHeaders.from || "",
          to: fullHeaders.to || "",
          cc: fullHeaders.cc || "",
          subject: fullHeaders.subject || "",
          date: fullHeaders.date || "",
          inReplyTo: fullHeaders["in-reply-to"] || "",
          references: fullHeaders.references || "",
          snippet: fullMsg.snippet || "",
          plainBody,
          htmlBody,
        };
        break;
      }

      case "modify-labels": {
        // Modify labels on a message: add and/or remove labels by name
        if (!messageId) {
          return new Response(JSON.stringify({ error: "messageId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        const labelsToAdd: string[] = addLabels || [];
        const labelsToRemove: string[] = removeLabels || [];
        
        if (labelsToAdd.length === 0 && labelsToRemove.length === 0) {
          result = { modified: false, message: "No labels to add or remove" };
          break;
        }
        
        // Fetch all labels once
        const allLabelsResp = await fetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/labels",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const allLabelsData = await allLabelsResp.json();
        const existingLabels: Array<{ id: string; name: string }> = allLabelsData.labels || [];
        
        // Resolve label names to IDs, creating if needed
        const resolveLabel = async (name: string): Promise<string | null> => {
          const found = existingLabels.find((l) => l.name === name);
          if (found) return found.id;
          // Create the label
          try {
            const createResp = await fetch(
              "https://gmail.googleapis.com/gmail/v1/users/me/labels",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ name }),
              }
            );
            const created = await createResp.json();
            if (created.id) {
              existingLabels.push({ id: created.id, name });
              return created.id;
            }
          } catch (e) {
            console.error(`Failed to create label "${name}":`, e);
          }
          return null;
        };
        
        const addLabelIds: string[] = [];
        const removeLabelIds: string[] = [];
        
        for (const name of labelsToAdd) {
          const id = await resolveLabel(name);
          if (id) addLabelIds.push(id);
        }
        for (const name of labelsToRemove) {
          const found = existingLabels.find((l) => l.name === name);
          if (found) removeLabelIds.push(found.id);
          // If label doesn't exist, nothing to remove
        }
        
        const modifyBody: Record<string, string[]> = {};
        if (addLabelIds.length > 0) modifyBody.addLabelIds = addLabelIds;
        if (removeLabelIds.length > 0) modifyBody.removeLabelIds = removeLabelIds;
        
        if (Object.keys(modifyBody).length > 0) {
          const modifyResp = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(modifyBody),
            }
          );
          
          if (!modifyResp.ok) {
            const errData = await modifyResp.json();
            throw new Error(`Failed to modify labels: ${errData.error?.message || "Unknown error"}`);
          }
        }
        
        result = { modified: true, addedLabels: labelsToAdd, removedLabels: labelsToRemove };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action. Use: list, get, get-message-full, send, process-inbox, modify-labels" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Gmail function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
