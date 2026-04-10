import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    scope: "https://www.googleapis.com/auth/spreadsheets",
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
  if (!data.access_token) throw new Error("Failed to get Google access token: " + JSON.stringify(data));
  return data.access_token;
}

// ─── Sheets API helpers ────────────────────────────────────────────

async function readSheet(accessToken: string, spreadsheetId: string, range: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.values || [];
}

async function getSheetTabs(accessToken: string, spreadsheetId: string): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.sheets || []).map((s: any) => s.properties.title);
}

async function batchUpdateCells(
  accessToken: string, spreadsheetId: string, updates: { range: string; value: string }[]
): Promise<void> {
  if (updates.length === 0) return;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const CHUNK = 500;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK);
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: chunk.map(u => ({ range: u.range, values: [[u.value]] })),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[BATCH] Batch update error: ${res.status} ${text}`);
    }
  }
}

async function updateCell(accessToken: string, spreadsheetId: string, range: string, value: string): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [[value]] }),
  });
}

function columnToLetter(col: number): string {
  let letter = "";
  let c = col;
  while (c >= 0) {
    letter = String.fromCharCode(65 + (c % 26)) + letter;
    c = Math.floor(c / 26) - 1;
  }
  return letter;
}

async function ensureGridColumn(accessToken: string, spreadsheetId: string, sheetName: string, colIndex: number): Promise<void> {
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
    const metaRes = await fetch(metaUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!metaRes.ok) return;
    const meta = await metaRes.json();
    const sheet = meta.sheets?.find((s: any) => s.properties?.title === sheetName) || meta.sheets?.[0];
    if (!sheet) return;
    const columnCount = sheet.properties.gridProperties?.columnCount || 26;
    if (colIndex >= columnCount) {
      const expandCount = colIndex - columnCount + 5; // give 5 extra
      const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
      await fetch(batchUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{ appendDimension: { sheetId: sheet.properties.sheetId, dimension: "COLUMNS", length: expandCount } }],
        }),
      });
    }
  } catch (e: any) {
    console.error(`[GRID] ensureGridColumn error: ${e.message}`);
  }
}

// ─── Pre-loaded reference data (copied from sync-sheets) ───────────

interface RefData {
  siglaMap: Map<string, string>;
  nameMap: Map<string, string>;
  clientMap: Map<string, string>;
  processMap: Map<string, string>;
  processClientMap: Map<string, string>;
  userAliasMap: Map<string, { userId: string; isOldUser: boolean }>;
}

async function preloadRefData(supabase: any): Promise<RefData> {
  const [profilesRes, processesRes, userAliasesRes] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name, sigla").eq("is_active", true),
    supabase.from("processes").select("id, numero_processo, id_cliente").limit(10000),
    supabase.from("user_aliases").select("alias, user_id, is_old_user"),
  ]);

  const siglaMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  for (const p of profilesRes.data || []) {
    if (p.sigla) siglaMap.set(p.sigla.toUpperCase(), p.user_id);
    if (p.full_name) nameMap.set(p.full_name.toLowerCase(), p.user_id);
  }

  const userAliasMap = new Map<string, { userId: string; isOldUser: boolean }>();
  for (const ua of userAliasesRes.data || []) {
    if (ua.alias) userAliasMap.set(ua.alias.toUpperCase(), { userId: ua.user_id, isOldUser: ua.is_old_user });
  }

  const processMap = new Map<string, string>();
  const processClientMap = new Map<string, string>();
  for (const p of processesRes.data || []) {
    if (!processMap.has(p.numero_processo)) {
      processMap.set(p.numero_processo, p.id);
      processClientMap.set(p.numero_processo, p.id_cliente);
    }
  }

  return { siglaMap, nameMap, clientMap: new Map(), processMap, processClientMap, userAliasMap };
}

function resolveUserFromRef(ref: RefData, identifier: string): string | null {
  if (!identifier?.trim()) return null;
  const id = identifier.trim();
  const aliasMatch = ref.userAliasMap.get(id.toUpperCase());
  if (aliasMatch) {
    if (aliasMatch.isOldUser) return "OLD_USER";
    return aliasMatch.userId;
  }
  if (id.length <= 5 && /^[A-Z]+$/i.test(id)) {
    const bySigla = ref.siglaMap.get(id.toUpperCase());
    if (bySigla) return bySigla;
  }
  const byName = ref.nameMap.get(id.toLowerCase());
  if (byName) return byName;
  const lower = id.toLowerCase();
  for (const [name, userId] of ref.nameMap) {
    if (name.includes(lower)) return userId;
  }
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────

function parseDateBR(val: string): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  const parts = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (parts) {
    const day = parts[1].padStart(2, "0");
    const month = parts[2].padStart(2, "0");
    let year = parts[3];
    if (year.length === 2) year = "20" + year;
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.substring(0, 10);
  const serial = Number(trimmed);
  if (serial > 40000 && serial < 60000) {
    const d = new Date((serial - 25569) * 86400000);
    return d.toISOString().substring(0, 10);
  }
  return null;
}

function normalizeCNJ(val: string): string {
  return (val || "").replace(/[\.\-\s\/]/g, "").trim();
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

// ─── Main Handler ─────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const saRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!saRaw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
    const sa = JSON.parse(saRaw);
    const accessToken = await getGoogleAccessToken(sa);

    const ref = await preloadRefData(supabase);
    
    // Load activity types
    const { data: actTypesRes } = await supabase.from("activity_types").select("id, name").eq("is_active", true);
    const actTypeMap = new Map<string, string>();
    for (const at of actTypesRes || []) {
      actTypeMap.set(at.name.toLowerCase(), at.id);
    }

    const tabs = await getSheetTabs(accessToken, SPREADSHEET_ID);
    console.log(`[sync-baixa-prazos] Loaded ${tabs.length} tabs.`);

    const timestamp = new Date().toISOString();
    let totalProcessed = 0;
    let totalFailed = 0;
    let totalDeadlinesCompleted = 0;

    for (const tab of tabs) {
      console.log(`[sync-baixa-prazos] Scanning tab: ${tab}`);
      try {
        const rows = await readSheet(accessToken, SPREADSHEET_ID, `'${tab}'!A1:Z`);
        if (rows.length < 2) continue;
        
        const hMap = mapHeaders(rows[0]);
        let actualSyncIdx: number;
        const syncKey = Object.keys(hMap).find(k => k.includes("sync") || k.includes("sincronizado"));
        
        if (syncKey && hMap[syncKey] !== undefined) {
          actualSyncIdx = hMap[syncKey];
        } else {
          actualSyncIdx = rows[0].length;
          await ensureGridColumn(accessToken, SPREADSHEET_ID, tab, actualSyncIdx);
          await updateCell(accessToken, SPREADSHEET_ID, `'${tab}'!${columnToLetter(actualSyncIdx)}1`, "status_sync");
        }
        
        const actualSyncLetter = columnToLetter(actualSyncIdx);
        const syncUpdates: { range: string; value: string }[] = [];
        
        const dataRows = rows.slice(1);
        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const rowNum = i + 2;

          const syncVal = row[actualSyncIdx] || "";
          if (syncVal.startsWith("SINCRONIZADO")) continue;

          // Mapping standard columns for the history sheet
          const dataLancRaw = getVal(row, hMap, "data_lancamento", "data", "fechamento");
          const dataLanc = parseDateBR(dataLancRaw);
          if (!dataLanc) continue; // Skip if no valid date

          // Limit to dates starting from 2025-01-01 per User request
          if (dataLanc < "2025-01-01") {
             // We can mark it as ignored to avoid rescanning it over and over
             syncUpdates.push({ range: `'${tab}'!${actualSyncLetter}${rowNum}`, value: `IGNORADO | < 2025` });
             continue;
          }

          const cnjRaw = getVal(row, hMap, "numero_processo", "n_processo");
          const responsavel = getVal(row, hMap, "profissional", "usuario");
          const descricao = getVal(row, hMap, "descritivo", "observacao") || `Importação histórica em ${dataLanc}`;
          const tipoAtividade = getVal(row, hMap, "tipo_atividade", "tipo");
          const cliente = getVal(row, hMap, "cliente");

          if (!cnjRaw || !responsavel) {
            syncUpdates.push({ range: `'${tab}'!${actualSyncLetter}${rowNum}`, value: `IGNORADO | Faltam dados essenciais` });
            continue;
          }
          
          const cnj = normalizeCNJ(cnjRaw);
          const userId = resolveUserFromRef(ref, responsavel);
          if (userId === "OLD_USER" || !userId) {
            syncUpdates.push({ range: `'${tab}'!${actualSyncLetter}${rowNum}`, value: `IGNORADO | User Inválido` });
            continue;
          }

          let processId: string | null = ref.processMap.get(cnj) || null;
          let clientId: string | null = ref.processClientMap.get(cnj) || null;

          // Fallback DB fetch
          if (!processId && cnj.length >= 10) {
            const { data: dbProc } = await supabase.from("processes").select("id, id_cliente").eq("numero_processo", cnj).maybeSingle();
            if (dbProc) {
              processId = dbProc.id;
              clientId = dbProc.id_cliente;
              ref.processMap.set(cnj, dbProc.id);
              ref.processClientMap.set(cnj, dbProc.id_cliente);
            }
          }

          if (!processId) {
             syncUpdates.push({ range: `'${tab}'!${actualSyncLetter}${rowNum}`, value: `FALHA | Processo não encontrado` });
             totalFailed++;
             continue;
          }

          let activityTypeId: string | null = null;
          if (tipoAtividade) {
            const lower = tipoAtividade.toLowerCase();
            for (const [name, id] of actTypeMap) {
              if (name.includes(lower) || lower.includes(name)) { activityTypeId = id; break; }
            }
          }

          // Insert Timesheet Entry
          const { data: tsData, error: tsErr } = await supabase.from("timesheet_entries").insert({
            user_id: userId,
            process_id: processId,
            client_id: clientId,
            activity_type_id: activityTypeId,
            data_atividade: dataLanc,
            descricao: descricao,
            quantidade: 1,
            reclamante_nome: cliente || null,
          }).select("id").single();

          if (tsErr) {
            if (tsErr.message?.includes("duplicate key") || tsErr.message?.includes("uq_timesheet")) {
              syncUpdates.push({ range: `'${tab}'!${actualSyncLetter}${rowNum}`, value: `SINCRONIZADO | ${timestamp} | já existia` });
              totalProcessed++;
              continue;
            }
            syncUpdates.push({ range: `'${tab}'!${actualSyncLetter}${rowNum}`, value: `FALHA | ts_error` });
            totalFailed++;
            continue;
          }

          // Complete corresponding open deadline natively via RPC
          const { data: compResult, error: compErr } = await supabase.rpc("core_complete_deadline", {
            payload: {
              process_id: processId,
              data_agendamento: dataLanc,
              completed_by: userId,
              completion_activity_type: tipoAtividade || null,
              timesheet_entry_id: tsData.id
            }
          });
          
          if (!compErr && compResult?.success && compResult.completed_count > 0) {
            totalDeadlinesCompleted += compResult.completed_count;
          }

          syncUpdates.push({ range: `'${tab}'!${actualSyncLetter}${rowNum}`, value: `SINCRONIZADO | ${timestamp}` });
          totalProcessed++;
        }

        if (syncUpdates.length > 0) {
          console.log(`[sync-baixa-prazos] Marking ${syncUpdates.length} rows as processed in ${tab}...`);
          await batchUpdateCells(accessToken, SPREADSHEET_ID, syncUpdates);
        }

      } catch (tabErr) {
        console.error(`[sync-baixa-prazos] Failed to safely process tab ${tab}:`, tabErr);
      }
    }

    const summary = { processed: totalProcessed, failed: totalFailed, deadlines_completed: totalDeadlinesCompleted };
    console.log(`[sync-baixa-prazos] Done.`, summary);
    return new Response(JSON.stringify(summary), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[sync-baixa-prazos] Fatal error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
