import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_DRIVE_ID = "0ABiR8Ngj0asyUk9PVA";

// ── Google Drive helpers ──

async function getAccessToken(credentials: any, userEmail: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKeyPem = credentials.private_key.replace(/\\n/g, "\n");
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

async function createFolder(accessToken: string, name: string, parentId: string): Promise<any> {
  const response = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Create folder error: ${data.error?.message}`);
  return data;
}

async function findOrCreateFolder(accessToken: string, name: string, parentId: string): Promise<any> {
  const existing = await findFolder(accessToken, name, parentId);
  if (existing) return existing;
  return createFolder(accessToken, name, parentId);
}

async function moveFile(accessToken: string, fileId: string, newParentId: string, currentParentId: string): Promise<any> {
  const params = new URLSearchParams({ addParents: newParentId, removeParents: currentParentId, supportsAllDrives: "true" });
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
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Rename error: ${data.error?.message}`);
  return data;
}

async function downloadFileAsBase64(accessToken: string, fileId: string): Promise<{ base64: string; mimeType: string }> {
  const metaResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,size&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const metaData = await metaResponse.json();
  if (!metaResponse.ok) throw new Error(`File metadata error: ${metaData.error?.message}`);

  const mimeType = metaData.mimeType || "application/pdf";
  const fileSize = parseInt(metaData.size || "0", 10);

  if (fileSize > 10 * 1024 * 1024) {
    throw new Error(`File too large (${Math.round(fileSize / 1024 / 1024)}MB). Maximum supported: 10MB`);
  }

  const downloadResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!downloadResponse.ok) {
    const errText = await downloadResponse.text();
    throw new Error(`File download error: ${downloadResponse.status} - ${errText.substring(0, 200)}`);
  }

  const buffer = await downloadResponse.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  const base64 = btoa(binary);

  return { base64, mimeType };
}

// ── Background processing ──

async function processInBackground(
  supabase: any,
  accessToken: string,
  pfId: string,
  fileId: string,
  fileName: string,
  destinationFolderId: string | undefined,
  sourceFolderId: string | undefined,
  lovableApiKey: string,
) {
  const startTime = Date.now();
  try {
    // 1. Download file
    console.log("[BG] Downloading file from Drive...");
    let fileBase64: string;
    let fileMimeType: string;
    try {
      const result = await downloadFileAsBase64(accessToken, fileId);
      fileBase64 = result.base64;
      fileMimeType = result.mimeType;
      console.log(`[BG] File downloaded. MIME: ${fileMimeType}, base64 length: ${fileBase64.length}`);
    } catch (dlErr: any) {
      console.error("[BG] Download error:", dlErr.message);
      await supabase
        .from("processed_files")
        .update({ status: "failed", error_message: `Download error: ${dlErr.message}`, processed_at: new Date().toISOString() })
        .eq("id", pfId);
      return;
    }

    const dataUrl = `data:${fileMimeType};base64,${fileBase64}`;

    // 2. Call AI for extraction
    console.log("[BG] Calling Gemini for contract extraction...");

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
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Analise este contrato e extraia os dados do CONTRATANTE (cliente): ${fileName || fileId}` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI error: ${aiResponse.status} - ${errorText.substring(0, 300)}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    console.log("[BG] AI response received, length:", content.length);

    if (content.startsWith("```")) {
      content = content.replace(/```json?\n?/g, "").replace(/```\s*$/g, "").trim();
    }

    let extracted: any;
    try {
      extracted = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Failed to parse AI response: ${content.substring(0, 200)}`);
      }
    }

    console.log("[BG] Extracted data:", JSON.stringify(extracted).substring(0, 300));

    const hasName = extracted?.nome || extracted?.razao_social;
    const hasId = extracted?.cnpj || extracted?.cpf;

    if (!hasName || !hasId) {
      await supabase
        .from("processed_files")
        .update({ status: "skipped", error_message: "Missing required fields (nome/razao_social and cpf/cnpj)", processed_at: new Date().toISOString() })
        .eq("id", pfId);
      console.log("[BG] Skipped — missing required fields");
      return;
    }

    // 3. Create or find client
    const identifier = extracted.cnpj || extracted.cpf;
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id, nome_fantasia, razao_social, nome")
      .or(`cnpj.eq.${identifier},cpf.eq.${identifier}`)
      .limit(1)
      .maybeSingle();

    let clientId = existingClient?.id;
    let clientName = existingClient?.nome_fantasia || existingClient?.razao_social || existingClient?.nome;
    let isNewClient = false;

    if (!clientId) {
      const { data: newClient, error: clientErr } = await supabase
        .from("clients")
        .insert({
          tipo: extracted.tipo_pessoa === "fisica" ? "fisica" : "juridica",
          nome: extracted.nome,
          razao_social: extracted.razao_social,
          cpf: extracted.cpf,
          cnpj: extracted.cnpj,
          nome_fantasia: extracted.nome_fantasia,
          representante_legal: extracted.representante_legal,
          cep: extracted.endereco?.cep,
          logradouro: extracted.endereco?.logradouro,
          numero: extracted.endereco?.numero,
          complemento: extracted.endereco?.complemento,
          bairro: extracted.endereco?.bairro,
          cidade: extracted.endereco?.cidade,
          estado: extracted.endereco?.estado,
          contrato_objeto: extracted.contrato?.objeto,
          contrato_data_inicio: extracted.contrato?.data_inicio,
          contrato_data_vencimento: extracted.contrato?.data_vencimento,
          contrato_condicoes_faturamento: extracted.contrato?.condicoes_faturamento,
        })
        .select()
        .single();

      if (clientErr) throw new Error(`Client creation failed: ${clientErr.message}`);
      clientId = newClient.id;
      clientName = newClient.nome_fantasia || newClient.razao_social || newClient.nome;
      isNewClient = true;
      console.log("[BG] New client created:", clientName);
    } else {
      console.log("[BG] Existing client found:", clientName);
    }

    // 4. Organize file in Drive
    let fileOrganized = false;
    if (destinationFolderId && clientName) {
      try {
        const clientFolder = await findOrCreateFolder(accessToken, clientName, destinationFolderId);
        const contratoFolder = await findOrCreateFolder(accessToken, "CONTRATO", clientFolder.id);

        if (sourceFolderId) {
          await moveFile(accessToken, fileId, contratoFolder.id, sourceFolderId);
        }

        const newName = `contrato_${clientName}_${new Date().toISOString().slice(0, 10)}.pdf`;
        await renameFile(accessToken, fileId, newName);
        fileOrganized = true;
        console.log("[BG] File organized in Drive");
      } catch (driveErr: any) {
        console.error("[BG] Drive organization error:", driveErr.message);
      }
    }

    // 5. Update processed_files with success
    await supabase
      .from("processed_files")
      .update({ client_id: clientId, status: "completed", processed_at: new Date().toISOString() })
      .eq("id", pfId);

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[BG] Complete in ${duration}s. Client: ${clientName}, new: ${isNewClient}, organized: ${fileOrganized}`);
  } catch (error: any) {
    console.error("[BG] Fatal error:", error.message);
    await supabase
      .from("processed_files")
      .update({ status: "failed", error_message: error.message, processed_at: new Date().toISOString() })
      .eq("id", pfId);
  }
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate API key
    const apiKey = req.headers.get("x-api-key") || req.headers.get("X-API-Key") || req.headers.get("MAKE_API") || req.headers.get("make_api");
    const expectedKey = Deno.env.get("EXTERNAL_API_KEY");
    if (!expectedKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse body
    const body = await req.json();
    const { file_id, file_name, user_email, destination_folder_id, source_folder_id } = body;

    if (!file_id || !user_email) {
      return new Response(
        JSON.stringify({ error: "file_id and user_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[WEBHOOK] Processing file_id=${file_id}, file_name=${file_name || "?"}, user=${user_email}`);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GOOGLE_SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!GOOGLE_SA_JSON) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const credentials = JSON.parse(GOOGLE_SA_JSON);

    // 3. Google auth
    console.log("[WEBHOOK] Getting Google access token...");
    const accessToken = await getAccessToken(credentials, user_email);
    console.log("[WEBHOOK] Token obtained");

    // 4. Check if already processed
    const { data: existingFile } = await supabase
      .from("processed_files")
      .select("id, status, client_id")
      .eq("drive_file_id", file_id)
      .limit(1)
      .maybeSingle();

    if (existingFile?.status === "completed") {
      console.log("[WEBHOOK] File already processed, returning existing result");
      return new Response(
        JSON.stringify({
          success: true,
          already_processed: true,
          client: { id: existingFile.client_id },
          message: "File was already processed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Register or reuse processed_files record
    let pf: any;

    if (existingFile) {
      const { data: updated, error: updateErr } = await supabase
        .from("processed_files")
        .update({ status: "processing", error_message: null, processed_at: null })
        .eq("id", existingFile.id)
        .select()
        .single();
      if (updateErr || !updated) {
        throw new Error(`Failed to update processed_files record: ${updateErr?.message || "unknown"}`);
      }
      pf = updated;
      console.log("[WEBHOOK] Reusing existing processed_files record:", pf.id);
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("processed_files")
        .insert({
          drive_file_id: file_id,
          file_name: file_name || file_id,
          status: "processing",
        })
        .select()
        .single();
      if (insertErr || !inserted) {
        throw new Error(`Failed to insert processed_files record: ${insertErr?.message || "unknown"}`);
      }
      pf = inserted;
      console.log("[WEBHOOK] Created new processed_files record:", pf.id);
    }

    // 6. Kick off background processing and return immediately
    const bgPromise = processInBackground(
      supabase,
      accessToken,
      pf.id,
      file_id,
      file_name || file_id,
      destination_folder_id,
      source_folder_id,
      LOVABLE_API_KEY,
    );

    // Use EdgeRuntime.waitUntil to keep the function alive after responding
    // @ts-ignore - EdgeRuntime is a Deno Deploy / Supabase global
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(bgPromise);
    } else {
      // Fallback: just fire-and-forget (the promise will still run)
      bgPromise.catch((err: any) => console.error("[WEBHOOK] Background error:", err.message));
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "processing",
        processed_file_id: pf.id,
        message: "File accepted for processing. Check processed_files table for results.",
      }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[WEBHOOK] Fatal error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
