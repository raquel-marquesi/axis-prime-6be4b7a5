import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHARED_DRIVE_ID = "0ABiR8Ngj0asyUk9PVA";

// Inline Google Drive helpers to avoid function invocation issues
async function getAccessToken(credentials: any, userEmail: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKeyPem = credentials.private_key.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(privateKeyPem, "RS256");
  
  const jwt = await new SignJWT({
    iss: credentials.client_email,
    sub: userEmail,
    scope: "https://www.googleapis.com/auth/drive",
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
  if (!tokenResponse.ok) throw new Error(`Token error: ${tokenData.error_description}`);
  return tokenData.access_token;
}

async function listDriveFiles(accessToken: string, folderId: string): Promise<any[]> {
  const params = new URLSearchParams({
    pageSize: "100",
    fields: "files(id,name,mimeType,createdTime,size)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    corpora: "drive",
    driveId: SHARED_DRIVE_ID,
    q: `'${folderId}' in parents and trashed = false`,
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Drive list error: ${data.error?.message}`);
  return data.files || [];
}

async function createFolder(accessToken: string, name: string, parentId: string): Promise<any> {
  const response = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Create folder error: ${data.error?.message}`);
  return data;
}

async function findFolder(accessToken: string, name: string, parentId: string): Promise<any | null> {
  const params = new URLSearchParams({
    pageSize: "1",
    fields: "files(id,name)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    corpora: "drive",
    driveId: SHARED_DRIVE_ID,
    q: `name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  return data.files?.[0] || null;
}

async function findOrCreateFolder(accessToken: string, name: string, parentId: string): Promise<any> {
  const existing = await findFolder(accessToken, name, parentId);
  if (existing) return existing;
  return createFolder(accessToken, name, parentId);
}

async function moveFile(accessToken: string, fileId: string, newParentId: string, currentParentId: string): Promise<any> {
  const params = new URLSearchParams({
    addParents: newParentId,
    removeParents: currentParentId,
    supportsAllDrives: "true",
  });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?${params}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Move error: ${data.error?.message}`);
  return data;
}

async function renameFile(accessToken: string, fileId: string, newName: string): Promise<any> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: newName }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Rename error: ${data.error?.message}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GOOGLE_SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    
    const {
      action = "run",
      userEmail,
      folderIdToMonitor,
      destinationParentId,
      notifyEmails = [],
      options = {}
    } = body;

    const { maxFilesToProcess = 10, filterByDate = false, hoursBack = 24, createFolderStructure = true, sendNotifications = true } = options;

    console.log(`Contract Monitor: action=${action}, userEmail=${userEmail}`);

    // Action: status
    if (action === "status") {
      const { data } = await supabase.from("agent_executions").select("*").order("started_at", { ascending: false }).limit(1).single();
      return new Response(JSON.stringify({ last_execution: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate required params for scan/run
    if (!userEmail || !folderIdToMonitor) {
      return new Response(JSON.stringify({ error: "userEmail and folderIdToMonitor are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get Google credentials
    if (!GOOGLE_SA_JSON) {
      return new Response(JSON.stringify({ error: "GOOGLE_SERVICE_ACCOUNT_JSON not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const credentials = JSON.parse(GOOGLE_SA_JSON);
    const accessToken = await getAccessToken(credentials, userEmail);

    // Action: scan - just list new files
    if (action === "scan") {
      const files = await listDriveFiles(accessToken, folderIdToMonitor);
      
      const validFiles = files.filter((f: any) => {
        const mime = f.mimeType || "";
        const size = parseInt(f.size) || 0;
        return (mime.includes("pdf") || mime.includes("document")) && size >= 50000 && size <= 52428800;
      });

      const { data: processed } = await supabase.from("processed_files").select("drive_file_id");
      const processedIds = new Set((processed || []).map((r: any) => r.drive_file_id));
      const newFiles = validFiles.filter((f: any) => !processedIds.has(f.id));

      return new Response(JSON.stringify({ files: newFiles, count: newFiles.length, total_in_folder: files.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action: run - full execution
    const executionId = `exec_${Date.now()}`;
    const { data: execution } = await supabase.from("agent_executions").insert({ execution_id: executionId, status: "running" }).select().single();

    const result = {
      execution_id: executionId,
      status: "completed",
      summary: { files_found: 0, files_new: 0, files_processed: 0, files_failed: 0, files_skipped: 0 },
      processed_files: [] as any[],
      errors: [] as string[],
      duration_seconds: 0
    };

    try {
      // 1. List files from Drive
      const files = await listDriveFiles(accessToken, folderIdToMonitor);

      let validFiles = files.filter((f: any) => {
        const mime = f.mimeType || "";
        const size = parseInt(f.size) || 0;
        return (mime.includes("pdf") || mime.includes("document")) && size >= 50000 && size <= 52428800;
      });

      if (filterByDate) {
        const cutoff = Date.now() - hoursBack * 3600000;
        validFiles = validFiles.filter((f: any) => new Date(f.createdTime).getTime() >= cutoff);
      }

      result.summary.files_found = validFiles.length;

      // 2. Filter new files
      const { data: processed } = await supabase.from("processed_files").select("drive_file_id");
      const processedIds = new Set((processed || []).map((r: any) => r.drive_file_id));
      const newFiles = validFiles.filter((f: any) => !processedIds.has(f.id)).slice(0, maxFilesToProcess);
      result.summary.files_new = newFiles.length;

      console.log(`Found ${validFiles.length} valid files, ${newFiles.length} new`);

      // 3. Process each file
      for (const file of newFiles) {
        console.log(`Processing: ${file.name}`);
        
        const { data: pf } = await supabase.from("processed_files").insert({
          drive_file_id: file.id, file_name: file.name, file_size: file.size, file_created_at: file.createdTime, status: "processing"
        }).select().single();

        try {
          const fileSize = parseInt(file.size) || 0;
          // NOTE: Lovable AI Gateway only supports image inputs via URL/data URL.
          // For large PDFs, converting to base64 exceeds function memory limits.
          // So we skip extraction for now to avoid stuck "processing" rows.
          if (fileSize > 10000000) {
            await supabase
              .from("processed_files")
              .update({
                status: "skipped",
                error_message: "Arquivo acima de 10MB: extração automática via IA ainda não suportada (limite técnico).",
                processed_at: new Date().toISOString(),
              })
              .eq("id", pf.id);

            result.summary.files_skipped++;
            result.processed_files.push({
              file_id: file.id,
              file_name: file.name,
              status: "skipped",
              error: "Arquivo acima de 10MB",
            });
            continue;
          }

          // Create temporary public permission for AI to access the file
          console.log(`Creating temporary access for file: ${file.name}`);
          
          const permResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${file.id}/permissions?supportsAllDrives=true`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                role: "reader",
                type: "anyone",
              }),
            }
          );
          
          if (!permResponse.ok) {
            const permError = await permResponse.text();
            console.error("Permission error:", permError);
            throw new Error(`Failed to create temporary permission: ${permResponse.status}`);
          }
          
          const permData = await permResponse.json();
          const permissionId = permData.id;
          console.log(`Temporary permission created: ${permissionId}`);
          
          // Get the webContentLink for direct download
          const fileMetaResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${file.id}?fields=webContentLink&supportsAllDrives=true`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          
          const fileMeta = await fileMetaResponse.json();
          // Use direct Google Drive export URL that works with Gemini
          const fileUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
          console.log(`Using file URL: ${fileUrl}`);
          
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

          const systemPrompt = `Você é um assistente especializado em extrair dados de contratos jurídicos brasileiros. Analise o documento PDF fornecido e extraia TODOS os dados relevantes em formato JSON.

IMPORTANTE:
- Extraia CPF/CNPJ apenas com números (sem pontos, traços ou barras)
- Identifique corretamente se é pessoa física ou jurídica
- Busque informações em todo o documento, incluindo cabeçalho, corpo e assinaturas
- Para datas, use formato YYYY-MM-DD

Retorne o JSON com esta estrutura:
{"tipo_pessoa":"fisica ou juridica","nome":"nome completo pessoa física","razao_social":"razão social se PJ","cpf":"apenas numeros","cnpj":"apenas numeros","nome_fantasia":"nome fantasia se PJ","representante_legal":"nome do representante","endereco":{"cep":"apenas numeros","logradouro":"rua/av","numero":"numero","complemento":"apto/sala","bairro":"bairro","cidade":"cidade","estado":"UF duas letras"},"contato":{"nome":"nome contato","email":"email","telefone":"telefone"},"contrato":{"objeto":"descrição resumida do objeto","data_inicio":"YYYY-MM-DD","data_vencimento":"YYYY-MM-DD","condicoes_faturamento":"condições de pagamento"}}

Retorne APENAS o JSON válido, sem markdown, sem explicações.`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-pro",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: [
                  { type: "text", text: `Analise este contrato PDF e extraia os dados do CONTRATANTE (cliente): ${file.name}` },
                  { type: "image_url", image_url: { url: fileUrl } }
                ]}
              ],
            }),
          });
          
          // Clean up: Remove temporary permission
          try {
            await fetch(
              `https://www.googleapis.com/drive/v3/files/${file.id}/permissions/${permissionId}?supportsAllDrives=true`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            );
            console.log("Temporary permission removed");
          } catch (cleanupErr) {
            console.error("Failed to remove permission:", cleanupErr);
          }

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error("AI error response:", errorText);
            throw new Error(`AI error: ${aiResponse.status} - ${errorText.substring(0, 200)}`);
          }

          const aiData = await aiResponse.json();
          console.log("AI full response:", JSON.stringify(aiData).substring(0, 1000));
          
          let content = aiData.choices?.[0]?.message?.content || "";
          
          // Check for refusal or empty response
          if (!content && aiData.choices?.[0]?.finish_reason) {
            console.log("AI finish_reason:", aiData.choices[0].finish_reason);
          }
          
          console.log("AI raw response length:", content.length);
          console.log("AI response preview:", content.substring(0, 500));
          
          // Clean markdown formatting
          if (content.startsWith("```")) {
            content = content.replace(/```json?\n?/g, "").replace(/```\s*$/g, "").trim();
          }
          
          // Try to extract JSON from response
          let extracted;
          try {
            extracted = JSON.parse(content);
          } catch (parseErr) {
            // Try to find JSON object in the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              extracted = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error(`Failed to parse AI response: ${content.substring(0, 200)}`);
            }
          }
          console.log("Extracted data:", JSON.stringify(extracted).substring(0, 300));
          const hasName = extracted?.nome || extracted?.razao_social;
          const hasId = extracted?.cnpj || extracted?.cpf;

          if (!hasName || !hasId) {
            await supabase.from("processed_files").update({ status: "skipped", error_message: "Missing required fields", processed_at: new Date().toISOString() }).eq("id", pf.id);
            result.summary.files_skipped++;
            result.processed_files.push({ file_id: file.id, file_name: file.name, status: "skipped", error: "Missing fields" });
            continue;
          }

          // Check duplicate
          const identifier = extracted.cnpj || extracted.cpf;
          const { data: existing } = await supabase.from("clients").select("id, nome_fantasia").or(`cnpj.eq.${identifier},cpf.eq.${identifier}`).limit(1).single();

          let clientId = existing?.id;
          let clientName = existing?.nome_fantasia;

          if (!clientId) {
            const { data: newClient, error: clientErr } = await supabase.from("clients").insert({
              tipo: extracted.tipo_pessoa === "fisica" ? "fisica" : "juridica",
              nome: extracted.nome, razao_social: extracted.razao_social, cpf: extracted.cpf, cnpj: extracted.cnpj,
              nome_fantasia: extracted.nome_fantasia, representante_legal: extracted.representante_legal,
              cep: extracted.endereco?.cep, logradouro: extracted.endereco?.logradouro, numero: extracted.endereco?.numero,
              complemento: extracted.endereco?.complemento, bairro: extracted.endereco?.bairro,
              cidade: extracted.endereco?.cidade, estado: extracted.endereco?.estado,
              contrato_objeto: extracted.contrato?.objeto, contrato_data_inicio: extracted.contrato?.data_inicio,
              contrato_data_vencimento: extracted.contrato?.data_vencimento, contrato_condicoes_faturamento: extracted.contrato?.condicoes_faturamento
            }).select().single();

            if (clientErr) throw new Error(clientErr.message);
            clientId = newClient.id;
            clientName = newClient.nome_fantasia || newClient.razao_social || newClient.nome;
          }

          // Create folder structure and move file
          let folderId = null;
          if (createFolderStructure && clientName && destinationParentId) {
            try {
              const clientFolder = await findOrCreateFolder(accessToken, clientName, destinationParentId);
              const contratoFolder = await findOrCreateFolder(accessToken, "CONTRATO", clientFolder.id);
              folderId = clientFolder.id;

              await moveFile(accessToken, file.id, contratoFolder.id, folderIdToMonitor);
              const newName = `contrato_${clientName}_${new Date().toISOString().slice(0, 10)}.pdf`;
              await renameFile(accessToken, file.id, newName);
            } catch (e) {
              console.error("Folder error:", e);
            }
          }

          await supabase.from("processed_files").update({
            client_id: clientId, folder_id: folderId, status: "completed", processed_at: new Date().toISOString()
          }).eq("id", pf.id);

          result.summary.files_processed++;
          result.processed_files.push({ file_id: file.id, file_name: file.name, client_id: clientId, client_name: clientName, status: "completed" });

        } catch (fileErr: any) {
          console.error(`Error processing ${file.name}:`, fileErr);
          await supabase.from("processed_files").update({ status: "failed", error_message: fileErr.message, processed_at: new Date().toISOString() }).eq("id", pf.id);
          result.summary.files_failed++;
          result.errors.push(`${file.name}: ${fileErr.message}`);
          result.processed_files.push({ file_id: file.id, file_name: file.name, status: "failed", error: fileErr.message });
        }
      }

      // Send notifications if configured
      if (sendNotifications && notifyEmails.length && result.summary.files_processed) {
        console.log(`Would send notifications to: ${notifyEmails.join(", ")}`);
      }

      result.status = result.summary.files_failed > 0 && result.summary.files_processed === 0 ? "failed" : "completed";

    } catch (err: any) {
      result.status = "failed";
      result.errors.push(err.message);
    }

    result.duration_seconds = Math.round((Date.now() - startTime) / 1000);

    await supabase.from("agent_executions").update({
      finished_at: new Date().toISOString(),
      total_files_found: result.summary.files_found,
      new_files_count: result.summary.files_new,
      processed_count: result.summary.files_processed,
      failed_count: result.summary.files_failed,
      status: result.status,
      error_message: result.errors.length ? result.errors.join("; ") : null
    }).eq("id", execution?.id);

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Contract monitor error:", error);
    return new Response(JSON.stringify({ error: error.message, duration_seconds: Math.round((Date.now() - startTime) / 1000) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
