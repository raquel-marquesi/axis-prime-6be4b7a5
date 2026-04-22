import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SPREADSHEET_ID = "14HZnCn1bWUSkIOOQPtnxwv79V08s2veNNAUrn0uMQOo";

// ─── Google Auth ───────────────────────────────────────────────────
function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(new TextEncoder().encode(JSON.stringify({
    iss: serviceAccount.client_email,
    sub: "raquel@marquesi.com.br", 
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })));

  const pem = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = base64url(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(`${header}.${payload}`)));

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${header}.${payload}.${sig}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get Google access token");
  return data.access_token;
}

// ─── Sheets API helpers ────────────────────────────────────────────
async function readSheet(accessToken: string, spreadsheetId: string, range: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Sheets API error ${res.status}`);
  const data = await res.json();
  return data.values || [];
}

async function getSheetTabs(accessToken: string, spreadsheetId: string): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Sheets API ${res.status}`);
  const data = await res.json();
  return (data.sheets || []).map((s: any) => s.properties.title);
}

function mapHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const key = h.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");
    map[key] = i;
  });
  return map;
}

function getVal(row: string[], headerMap: Record<string, number>, ...keys: string[]): string {
  for (const k of keys) {
    const idx = headerMap[k];
    if (idx !== undefined && row[idx]?.trim()) return row[idx].trim();
  }
  return "";
}

function normalizeCNJ(val: string): string {
  return (val || "").replace(/[\.\-\s\/]/g, "").trim();
}

// ─── Main Handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Pegar todos os prazos atrasados do Axis (is_completed = false e data_prazo < HOJE)
    const { data: prazosAtrasados, error: errDb } = await supabase
      .from('process_deadlines')
      .select('id, data_prazo, ocorrencia, processes(numero_processo)')
      .eq('is_completed', false)
      .lt('data_prazo', new Date().toISOString().split('T')[0]);

    if (errDb) throw new Error("Erro ao buscar prazos no BD: " + errDb.message);

    const cnjsAtrasados = new Set(
      (prazosAtrasados || []).map(p => normalizeCNJ(p.processes?.numero_processo || ""))
    );
    
    // 2. Conectar na Planilha
    const saRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!saRaw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
    const sa = JSON.parse(saRaw);
    const accessToken = await getGoogleAccessToken(sa);

    const tabs = await getSheetTabs(accessToken, SPREADSHEET_ID);
    
    const encontradosNaPlanilha = [];

    // 3. Buscar os processos atrasados dentro da planilha para extrair os dados
    for (const tab of tabs) {
      if(tab === "Dropdowns" || tab.includes("Config")) continue;
      
      const rows = await readSheet(accessToken, SPREADSHEET_ID, `'${tab}'!A1:Z`);
      if (rows.length < 2) continue;
      
      const hMap = mapHeaders(rows[0]);
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cnjRowRaw = getVal(row, hMap, "numero_processo", "n_processo");
        const cnjRow = normalizeCNJ(cnjRowRaw);
        
        // Se este processo estiver na lista dos 219 prazos em aberto do Axis
        if (cnjRow && cnjsAtrasados.has(cnjRow)) {
          encontradosNaPlanilha.push({
            processo: cnjRowRaw,
            quem_cumpriu: getVal(row, hMap, "profissional", "usuario"),
            quando_cumpriu: getVal(row, hMap, "data_lancamento", "data", "fechamento"),
            descricao_feitio: getVal(row, hMap, "descritivo", "observacao"),
            aba_encontrada: tab,
            linha: i + 1,
            status_de_sincronizacao: getVal(row, hMap, "status_sync", "sincronizado")
          });
        }
      }
    }

    return new Response(JSON.stringify({ 
      prazos_atrasados_no_axis: prazosAtrasados.length, 
      verificacao_na_planilha: encontradosNaPlanilha 
    }, null, 2), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
