import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMPERSONATE_USER = "raquel@marquesi.com.br";

const LABELS = {
  PROCESSED: "Processado-IA",
  IGNORED: "IgnoradoIA",
  ERROR: "ErroProcessamentoIA",
};

// ---- AI Triage ----
async function classifyEmailIntent(plainBody: string, lovableApiKey: string): Promise<"ACUSO" | "PRAZO" | "NOVO_PROCESSO" | "ERRO"> {
  try {
    const truncated = (plainBody || "").substring(0, 1500);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "Você é um classificador de e-mails jurídicos. Responda APENAS com uma das etiquetas: ACUSO, NOVO_PROCESSO ou PRAZO.",
          },
          {
            role: "user",
            content: `Analise o e-mail jurídico abaixo e responda APENAS com uma das etiquetas:
1. 'ACUSO' (se for apenas confirmação de recebimento, agradecimento, 'ok', 'ciente', ou resposta sem conteúdo substancial).
2. 'NOVO_PROCESSO' (se o usuário estiver reaproveitando um e-mail antigo para pedir cálculo de um NOVO número de processo ou caso diferente).
3. 'PRAZO' (se o e-mail trouxer uma data de prazo ou solicitação de cálculo para o caso atual).

Texto do e-mail:
${truncated}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("AI Gateway rate limited, defaulting to PRAZO");
        return "PRAZO";
      }
      if (response.status === 402) {
        console.warn("AI Gateway credits exhausted, defaulting to PRAZO");
        return "PRAZO";
      }
      console.error("AI Gateway error:", response.status, await response.text());
      return "ERRO";
    }

    const data = await response.json();
    const text = (data.choices?.[0]?.message?.content || "").trim().toUpperCase();

    if (text.includes("ACUSO")) return "ACUSO";
    if (text.includes("NOVO_PROCESSO")) return "NOVO_PROCESSO";
    return "PRAZO";
  } catch (err) {
    console.error("AI classification error:", err);
    return "ERRO";
  }
}

// ---- Gmail helpers ----
async function callGmail(supabaseUrl: string, serviceKey: string, payload: Record<string, unknown>): Promise<any> {
  const url = `${supabaseUrl}/functions/v1/google-gmail`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ ...payload, userEmail: IMPERSONATE_USER }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gmail function error (${resp.status}): ${errText}`);
  }

  return resp.json();
}

async function modifyLabels(
  supabaseUrl: string,
  serviceKey: string,
  messageId: string,
  addLabels: string[],
  removeLabels: string[]
): Promise<void> {
  try {
    await callGmail(supabaseUrl, serviceKey, {
      action: "modify-labels",
      messageId,
      addLabels,
      removeLabels,
    });
  } catch (err) {
    console.error(`Failed to modify labels for ${messageId}:`, err);
  }
}

// ---- Main handler ----
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Create processing log
  const { data: processingLog } = await supabase
    .from("processing_logs")
    .insert({
      source: "cron",
      started_at: new Date().toISOString(),
      emails_found: 0,
    })
    .select()
    .single();
  const logId = processingLog?.id;

  try {
    // Fetch active monitored emails
    const { data: monitoredEmails, error: fetchError } = await supabase
      .from("monitored_emails")
      .select("*")
      .eq("is_active", true);

    if (fetchError) throw new Error(`Failed to fetch monitored emails: ${fetchError.message}`);
    if (!monitoredEmails || monitoredEmails.length === 0) {
      console.log("No active monitored emails found");
      if (logId) {
        await supabase.from("processing_logs").update({
          finished_at: new Date().toISOString(),
          emails_found: 0,
          emails_processed: 0,
        }).eq("id", logId);
      }
      return new Response(JSON.stringify({ message: "No active monitored emails" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${monitoredEmails.length} monitored inboxes`);

    let totalFound = 0;
    let totalCreated = 0;
    let totalIgnored = 0;
    let totalSkippedDuplicate = 0;
    let totalSkippedDeadlineExists = 0;
    const allErrors: string[] = [];

    for (const monitoredEmail of monitoredEmails) {
      try {
        const groupEmail = monitoredEmail.email;
        console.log(`Processing inbox: ${groupEmail}`);

        // 1. Search Gmail for unread, unprocessed emails sent to this group
        const searchQuery = `to:${groupEmail} is:unread -label:${LABELS.PROCESSED} -label:${LABELS.IGNORED}`;

        let messagesList: Array<{ id: string; threadId: string }>;
        try {
          const listResult = await callGmail(supabaseUrl, supabaseServiceKey, {
            action: "list",
            query: searchQuery,
            maxResults: 10,
          });
          messagesList = listResult.messages || [];
        } catch (listErr) {
          console.error(`Gmail list failed for ${groupEmail}:`, listErr);
          allErrors.push(`${groupEmail}: list failed - ${listErr instanceof Error ? listErr.message : "Unknown"}`);
          continue;
        }

        if (messagesList.length === 0) {
          console.log(`${groupEmail}: no unread messages`);
          continue;
        }

        console.log(`${groupEmail}: found ${messagesList.length} messages`);
        totalFound += messagesList.length;

        // 2. Process each message
        for (const msgRef of messagesList) {
          try {
            // a. Get full message content
            let fullMsg: any;
            try {
              fullMsg = await callGmail(supabaseUrl, supabaseServiceKey, {
                action: "get-message-full",
                messageId: msgRef.id,
              });
            } catch (getMsgErr) {
              console.error(`Failed to get message ${msgRef.id}:`, getMsgErr);
              allErrors.push(`${groupEmail}: get ${msgRef.id} failed`);
              continue;
            }

            // b. AI Triage
            const classification = await classifyEmailIntent(fullMsg.plainBody || fullMsg.htmlBody || "", lovableApiKey);
            console.log(`${groupEmail} [${msgRef.id}]: AI classification = ${classification}`);

            // c. ACUSO → ignore
            if (classification === "ACUSO") {
              await modifyLabels(supabaseUrl, supabaseServiceKey, msgRef.id,
                [LABELS.IGNORED],
                [LABELS.ERROR]
              );
              totalIgnored++;
              console.log(`${groupEmail} [${msgRef.id}]: Ignored (ACUSO)`);
              continue;
            }

            // d. Deduplication: check if email_id already exists in solicitacoes
            const { data: existingSol } = await supabase
              .from("solicitacoes")
              .select("id")
              .eq("email_id", msgRef.id)
              .maybeSingle();

            if (existingSol) {
              await modifyLabels(supabaseUrl, supabaseServiceKey, msgRef.id,
                [LABELS.PROCESSED],
                [LABELS.ERROR]
              );
              totalSkippedDuplicate++;
              console.log(`${groupEmail} [${msgRef.id}]: Skipped (duplicate solicitacao ${existingSol.id})`);
              continue;
            }

            // e. Check if deadline already exists for this email_message_id
            const { data: existingDeadline } = await supabase
              .from("process_deadlines")
              .select("id")
              .eq("email_message_id", msgRef.id)
              .maybeSingle();

            if (existingDeadline) {
              await modifyLabels(supabaseUrl, supabaseServiceKey, msgRef.id,
                [LABELS.PROCESSED],
                [LABELS.ERROR]
              );
              totalSkippedDeadlineExists++;
              console.log(`${groupEmail} [${msgRef.id}]: Skipped (deadline already exists ${existingDeadline.id})`);
              continue;
            }

            // f. Email processing is now handled by GAS → Planilha → sync-email-agendamentos
            // Just label the email as processed to avoid reprocessing
            await modifyLabels(supabaseUrl, supabaseServiceKey, msgRef.id,
              [LABELS.PROCESSED],
              [LABELS.ERROR]
            );
            totalCreated++;
            console.log(`${groupEmail} [${msgRef.id}]: Labeled as processed (handled by GAS pipeline)`);
          } catch (msgError) {
            console.error(`Error processing message ${msgRef.id}:`, msgError);
            allErrors.push(`${groupEmail} [${msgRef.id}]: ${msgError instanceof Error ? msgError.message : "Unknown"}`);

            // Try to add error label
            await modifyLabels(supabaseUrl, supabaseServiceKey, msgRef.id, [LABELS.ERROR], []);
          }
        }
      } catch (inboxError) {
        console.error(`Error processing ${monitoredEmail.email}:`, inboxError);
        allErrors.push(`${monitoredEmail.email}: ${inboxError instanceof Error ? inboxError.message : "Unknown"}`);
      }
    }

    // Update processing log
    if (logId) {
      await supabase.from("processing_logs").update({
        finished_at: new Date().toISOString(),
        emails_found: totalFound,
        emails_processed: totalCreated,
        errors: allErrors.length > 0 ? allErrors : null,
      }).eq("id", logId);
    }

    const result = {
      inboxes_processed: monitoredEmails.length,
      emails_found: totalFound,
      solicitacoes_created: totalCreated,
      emails_ignored_acuso: totalIgnored,
      skipped_duplicate: totalSkippedDuplicate,
      skipped_deadline_exists: totalSkippedDeadlineExists,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };

    console.log("Processing complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Process monitored inboxes error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (logId) {
      await supabase.from("processing_logs").update({
        finished_at: new Date().toISOString(),
        errors: [errorMessage],
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
