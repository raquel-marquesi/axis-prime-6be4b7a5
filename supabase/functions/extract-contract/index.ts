import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Extract Google Drive file ID from various URL formats
function extractFileId(url: string): string | null {
  // Format: /file/d/FILE_ID/
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) return match1[1];

  // Format: ?id=FILE_ID or &id=FILE_ID
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];

  // Format: /open?id=FILE_ID
  const match3 = url.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  if (match3) return match3[1];

  return null;
}

async function getServiceAccountToken(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKeyPem = credentials.private_key.replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(privateKeyPem, "RS256");

  const jwt = await new SignJWT({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
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

async function downloadFileAsBase64(accessToken: string, fileId: string): Promise<{ base64: string; mimeType: string }> {
  // Get file metadata
  const metaResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,size&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const metaData = await metaResponse.json();
  if (!metaResponse.ok) throw new Error(`File metadata error: ${metaData.error?.message}`);

  const mimeType = metaData.mimeType || "application/pdf";
  const fileSize = parseInt(metaData.size || "0", 10);

  if (fileSize > 10 * 1024 * 1024) {
    throw new Error(`File too large (${Math.round(fileSize / 1024 / 1024)}MB). Maximum: 10MB`);
  }

  // Download content
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GOOGLE_SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { file_url, document_id, client_id } = await req.json();

    if (!file_url) {
      return new Response(
        JSON.stringify({ error: "file_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting extraction for document_id:", document_id);

    // Create extraction record
    const { data: extraction, error: insertError } = await supabase
      .from("contract_extractions")
      .insert({
        client_id: client_id || null,
        document_id: document_id || null,
        file_url,
        status: "processing",
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(insertError.message);
    }

    // Download file and convert to base64
    const fileId = extractFileId(file_url);
    let dataUrl: string;

    if (fileId && GOOGLE_SA_JSON) {
      // File is from Google Drive - download via API
      console.log("Downloading from Google Drive, file_id:", fileId);
      const credentials = JSON.parse(GOOGLE_SA_JSON);
      const accessToken = await getServiceAccountToken(credentials);
      const { base64, mimeType } = await downloadFileAsBase64(accessToken, fileId);
      dataUrl = `data:${mimeType};base64,${base64}`;
      console.log(`File downloaded. MIME: ${mimeType}, base64 length: ${base64.length}`);
    } else {
      // Not a Drive URL or no credentials - try using URL directly
      console.log("Using file_url directly (not a Drive URL or no SA credentials)");
      dataUrl = file_url;
    }

    // Call Lovable AI
    const systemPrompt = `Você é um assistente especializado em extrair dados de contratos jurídicos brasileiros.
Analise o documento e extraia os seguintes campos em formato JSON:

{
  "tipo_pessoa": "fisica" ou "juridica",
  "nome": "nome completo ou null",
  "razao_social": "razão social ou null",
  "cpf": "apenas números ou null",
  "cnpj": "apenas números ou null",
  "nome_fantasia": "nome fantasia ou null",
  "representante_legal": "representante ou null",
  "endereco": {
    "cep": "números ou null",
    "logradouro": "rua ou null",
    "numero": "número ou null",
    "complemento": "complemento ou null",
    "bairro": "bairro ou null",
    "cidade": "cidade ou null",
    "estado": "UF ou null"
  },
  "contato": {
    "nome": "contato ou null",
    "email": "email ou null",
    "telefone": "números ou null",
    "celular": "números ou null"
  },
  "contrato": {
    "objeto": "objeto ou null",
    "data_inicio": "YYYY-MM-DD ou null",
    "data_vencimento": "YYYY-MM-DD ou null",
    "condicoes_faturamento": "condições ou null"
  },
  "confianca": 0-100
}

Retorne APENAS o JSON válido, sem markdown.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Extraia os dados deste contrato:" },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      
      await supabase
        .from("contract_extractions")
        .update({ status: "failed", error_message: `AI error: ${aiResponse.status}`, processed_at: new Date().toISOString() })
        .eq("id", extraction.id);

      return new Response(
        JSON.stringify({ success: false, error: `AI error: ${aiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let jsonContent = content.trim();
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    let extractedData;
    try {
      extractedData = JSON.parse(jsonContent);
    } catch {
      console.error("JSON parse error:", jsonContent);
      await supabase
        .from("contract_extractions")
        .update({ status: "failed", error_message: "Failed to parse AI response", processed_at: new Date().toISOString() })
        .eq("id", extraction.id);

      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const confidence = extractedData.confianca || 0;
    const missingFields: string[] = [];

    if (!extractedData.tipo_pessoa) missingFields.push("Tipo de Pessoa");
    if (extractedData.tipo_pessoa === "fisica" && !extractedData.nome) missingFields.push("Nome");
    if (extractedData.tipo_pessoa === "juridica" && !extractedData.razao_social) missingFields.push("Razão Social");
    if (!extractedData.endereco?.cidade) missingFields.push("Cidade");
    if (!extractedData.contato?.email) missingFields.push("Email");

    await supabase
      .from("contract_extractions")
      .update({
        extracted_data: extractedData,
        confidence,
        missing_fields: missingFields,
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", extraction.id);

    console.log("Extraction completed. Confidence:", confidence);

    return new Response(
      JSON.stringify({
        success: true,
        extraction_id: extraction.id,
        extracted_data: extractedData,
        confidence,
        missing_fields: missingFields,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
