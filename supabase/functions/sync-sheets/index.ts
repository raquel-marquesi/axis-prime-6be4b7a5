import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SPREADSHEET_ATIVIDADES = "1lRLiCtMYnYRm7VJnLpTiUvdBVIWUSOLxFhOyFvOXqOQ";
const SPREADSHEET_AGENDAMENTOS = "1WhIQS2W2Gkx1_Dh_untrLKuACTOmpqURnjx_aH3ik4I";

// ─── Google Auth ───────────────────────────────────────────────────

function base64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
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

async function batchUpdateCells(
  accessToken: string, spreadsheetId: string, updates: { range: string; value: string }[]
): Promise<void> {
  if (updates.length === 0) return;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  // Process in chunks of 500 to avoid API limits
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
      const expandCount = colIndex - columnCount + 1;
      console.log(`[GRID] Expanding ${sheetName} by ${expandCount} column(s) (current: ${columnCount}, need: ${colIndex + 1})`);
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

// ─── Pre-loaded reference data ─────────────────────────────────────

interface RefData {
  siglaMap: Map<string, string>;
  nameMap: Map<string, string>;
  clientMap: Map<string, string>;
  processMap: Map<string, string>;
  processClientMap: Map<string, string>;
  userAliasMap: Map<string, { userId: string; isOldUser: boolean }>;
}

async function preloadRefData(supabase: any): Promise<RefData> {
  const [profilesRes, clientsRes, processesRes, aliasesRes, userAliasesRes] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name, sigla").eq("is_active", true),
    supabase.from("clients").select("id, razao_social, nome_fantasia, nome").eq("is_active", true),
    supabase.from("processes").select("id, numero_processo, id_cliente").limit(10000),
    supabase.from("client_aliases").select("alias, client_id"),
    supabase.from("user_aliases").select("alias, user_id, is_old_user"),
  ]);

  const siglaMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  for (const p of profilesRes.data || []) {
    if (p.sigla) siglaMap.set(p.sigla.toUpperCase(), p.user_id);
    if (p.full_name) nameMap.set(p.full_name.toLowerCase(), p.user_id);
  }

  const clientMap = new Map<string, string>();
  for (const c of clientsRes.data || []) {
    if (c.razao_social) clientMap.set(c.razao_social.toLowerCase(), c.id);
    if (c.nome_fantasia) clientMap.set(c.nome_fantasia.toLowerCase(), c.id);
    if (c.nome) clientMap.set(c.nome.toLowerCase(), c.id);
  }
  // Load aliases into clientMap so they resolve automatically
  for (const a of aliasesRes.data || []) {
    if (a.alias) clientMap.set(a.alias.toLowerCase(), a.client_id);
  }

  // Load user aliases
  const userAliasMap = new Map<string, { userId: string; isOldUser: boolean }>();
  for (const ua of userAliasesRes.data || []) {
    if (ua.alias) userAliasMap.set(ua.alias.toUpperCase(), { userId: ua.user_id, isOldUser: ua.is_old_user });
  }

  const processMap = new Map<string, string>();
  const processClientMap = new Map<string, string>();
  for (const p of processesRes.data || []) {
    // Keep only the first (oldest) entry per numero_processo to avoid losing references
    if (!processMap.has(p.numero_processo)) {
      processMap.set(p.numero_processo, p.id);
      processClientMap.set(p.numero_processo, p.id_cliente);
    }
  }

  return { siglaMap, nameMap, clientMap, processMap, processClientMap, userAliasMap };
}

// Returns user_id, or "OLD_USER" for ex-employees (skip silently), or null (error)
function resolveUserFromRef(ref: RefData, identifier: string): string | null {
  if (!identifier?.trim()) return null;
  const id = identifier.trim();
  // Check user aliases first (includes old user marking)
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

function resolveClientFromRef(ref: RefData, clientName: string): string | null {
  if (!clientName?.trim()) return null;
  const name = clientName.trim().toLowerCase();
  const exact = ref.clientMap.get(name);
  if (exact) return exact;
  for (const [key, id] of ref.clientMap) {
    if (key.includes(name) || name.includes(key)) return id;
  }
  // Token-based fuzzy matching: "LOMA - BIG - WMSE" → tokens ["loma","big","wmse"]
  const tokens = name.split(/[\s\-\/]+/).filter(t => t.length > 1);
  if (tokens.length >= 2) {
    for (const [key, id] of ref.clientMap) {
      const keyNorm = key.replace(/[\/\-]/g, " ").toLowerCase();
      // Relaxed matching: at least 2 tokens AND >= 50% of tokens must match
      const matchCount = tokens.filter(t => keyNorm.includes(t)).length;
      if (matchCount >= 2 && matchCount >= tokens.length * 0.5) return id;
    }
  }
  return null;
}

// ─── Date parsing ──────────────────────────────────────────────────

function parseDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  // DD/MM/YYYY
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return trimmed; // fallback
}

// ─── Header mapping ────────────────────────────────────────────────

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


// ─── Process Atividades sheet ──────────────────────────────────────

async function processAtividadesSheet(
  accessToken: string, supabase: any, ref: RefData
): Promise<{ found: number; processed: number; failed: number; errors: string[] }> {
  console.log("[ATIVIDADES] Reading spreadsheet...");
  const rows = await readSheet(accessToken, SPREADSHEET_ATIVIDADES, "A:Z");
  console.log(`[ATIVIDADES] Got ${rows.length} total rows`);
  if (rows.length < 2) return { found: 0, processed: 0, failed: 0, errors: [] };

  const headers = rows[0];
  const hMap = mapHeaders(headers);

  let actualSyncIdx: number;
  const existingSyncIdx = Object.entries(hMap).find(([k]) => k.includes("status_sync") || k.includes("sincronizado"));
  if (existingSyncIdx) {
    actualSyncIdx = existingSyncIdx[1];
  } else {
    actualSyncIdx = headers.length;
    await ensureGridColumn(accessToken, SPREADSHEET_ATIVIDADES, "Página1", actualSyncIdx);
    await updateCell(accessToken, SPREADSHEET_ATIVIDADES, `${columnToLetter(actualSyncIdx)}1`, "status_sync");
  }
  const actualSyncLetter = columnToLetter(actualSyncIdx);

  // Pre-load activity types and open deadlines in parallel
  const [actTypesRes] = await Promise.all([
    supabase.from("activity_types").select("id, name").eq("is_active", true),
  ]);

  const actTypeMap = new Map<string, string>();
  for (const at of actTypesRes.data || []) {
    actTypeMap.set(at.name.toLowerCase(), at.id);
  }

  console.log(`[ATIVIDADES] Loaded ${actTypeMap.size} activity types`);

  let processed = 0, failed = 0, deadlinesCompleted = 0;
  const errors: string[] = [];
  const dataRows = rows.slice(1);
  let newRows = 0;
  const syncUpdates: { range: string; value: string }[] = [];
  const timestamp = new Date().toISOString();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2;

    const syncVal = row[actualSyncIdx] || "";
    if (syncVal.startsWith("SINCRONIZADO")) continue;

    const numProcesso = getVal(row, hMap, "numero_processo", "numero", "processo", "n_processo");
    const dataAtividadeRaw = getVal(row, hMap, "data_atividade", "data", "dia");
    const dataAtividade = parseDateBR(dataAtividadeRaw);
    const descricao = getVal(row, hMap, "descricao", "atividade", "tarefa", "observacao");
    const responsavel = getVal(row, hMap, "responsavel", "advogado", "usuario", "sigla", "profissional");
    const tipoAtividade = getVal(row, hMap, "tipo_atividade", "tipo", "atividade_tipo");
    const tipoPrazo = getVal(row, hMap, "tipo_prazo", "tipo_agenda");
    const quantidade = getVal(row, hMap, "quantidade", "qtd", "qtde") || "1";
    const reclamante = getVal(row, hMap, "reclamante", "reclamante_nome", "parte_contraria");

    if (!dataAtividade || !descricao) continue;
    newRows++;

    if (processed + failed >= 100) break;

    try {
      const userId = resolveUserFromRef(ref, responsavel);
      if (userId === "OLD_USER") {
        // Ex-employee alias — skip silently
        continue;
      }
      if (!userId) {
        errors.push(`L${rowNum}: responsavel "${responsavel}" nao encontrado`);
        failed++;
        continue;
      }

      let processId: string | null = null;
      if (numProcesso && numProcesso.length >= 5) {
        processId = ref.processMap.get(numProcesso) || null;
        // DB fallback if not in preloaded map
        if (!processId) {
          const { data: dbProc } = await supabase
            .from("processes")
            .select("id, id_cliente")
            .eq("numero_processo", numProcesso)
            .maybeSingle();
          if (dbProc) {
            processId = dbProc.id;
            ref.processMap.set(numProcesso, dbProc.id);
            ref.processClientMap.set(numProcesso, dbProc.id_cliente);
          }
        }
      }

      let activityTypeId: string | null = null;
      if (tipoAtividade) {
        const lower = tipoAtividade.toLowerCase();
        activityTypeId = actTypeMap.get(lower) || null;
        if (!activityTypeId) {
          for (const [name, id] of actTypeMap) {
            if (name.includes(lower) || lower.includes(name)) { activityTypeId = id; break; }
          }
        }
      }

      const processId = processIdRaw;
      const clientId = processId ? ref.processClientMap.get(numProcesso) : null;

      const { data: tsData, error: tsErr } = await supabase.from("timesheet_entries").insert({
        user_id: userId,
        process_id: processId,
        client_id: clientId,
        activity_type_id: activityTypeId,
        data_atividade: dataAtividade,
        descricao: descricao,
        quantidade: parseInt(quantidade) || 1,
        reclamante_nome: reclamante || null,
      }).select("id").single();

      if (tsErr) {
        // If duplicate key, mark as synced and skip (already imported via XLSX or previous run)
        if (tsErr.message?.includes("duplicate key") || tsErr.message?.includes("uq_timesheet")) {
          syncUpdates.push({ range: `${actualSyncLetter}${rowNum}`, value: `SINCRONIZADO | ${timestamp} | já existia` });
          processed++;
          continue;
        }
        errors.push(`L${rowNum}: timesheet: ${tsErr.message}`);
        failed++;
        continue;
      }

      // ── Deadline auto-completion via DB Hub ──
      if (processId) {
        const { data: compResult, error: compErr } = await supabase.rpc("core_complete_deadline", {
          payload: {
            process_id: processId,
            data_agendamento: dataAtividade,
            completed_by: userId,
            completion_activity_type: tipoAtividade || null,
            timesheet_entry_id: tsData.id
          }
        });
        
        if (!compErr && compResult?.success && compResult.completed_count > 0) {
          deadlinesCompleted += compResult.completed_count;
        } else if (compErr || (compResult && !compResult.success)) {
          console.error(`[ATIVIDADES] L${rowNum}: deadline completion RPC error:`, compErr || compResult?.error);
        }
      }

      syncUpdates.push({ range: `${actualSyncLetter}${rowNum}`, value: `SINCRONIZADO | ${timestamp}` });
      processed++;
    } catch (e: any) {
      errors.push(`L${rowNum}: ${e.message}`);
      failed++;
    }

    if (newRows % 100 === 0) console.log(`[ATIVIDADES] Progress: ${newRows} checked, ${processed} ok, ${failed} fail`);
  }

  console.log(`[ATIVIDADES] Batch marking ${syncUpdates.length} rows as synced...`);
  await batchUpdateCells(accessToken, SPREADSHEET_ATIVIDADES, syncUpdates);

  console.log(`[ATIVIDADES] Done: ${newRows} new, ${processed} processed, ${failed} failed, ${deadlinesCompleted} deadlines completed`);
  return { found: newRows, processed, failed, deadlines_completed: deadlinesCompleted, errors: errors.slice(0, 50) };
}

// ─── Agendamentos step removed — GAS/email integration is the canonical source ──

// ─── Main handler ──────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("[STEP 1] Authenticating request...");

    const apiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
    const expectedApiKey = Deno.env.get("EXTERNAL_API_KEY");
    const authHeader = req.headers.get("Authorization");

    const isApiKeyAuth = apiKey && expectedApiKey && apiKey === expectedApiKey;
    const isJwtAuth = authHeader?.startsWith("Bearer ");

    if (!isApiKeyAuth && !isJwtAuth) {
      console.log("[AUTH] Failed: no valid API key or JWT");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[STEP 1] Auth OK (method:", isApiKeyAuth ? "API_KEY" : "JWT", ")");

    // ── Check for "read" action (generic sheet reader) ──
    let body: any = {};
    try { body = await req.clone().json(); } catch { /* no body or not JSON */ }

    if (body?.action === "read") {
      const { spreadsheetId, range } = body;
      if (!spreadsheetId || !range) {
        return new Response(JSON.stringify({ error: "Missing spreadsheetId or range" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`[READ] Reading ${spreadsheetId} range=${range}`);
      const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
      if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
      const serviceAccount = JSON.parse(saJson);
      const accessToken = await getGoogleAccessToken(serviceAccount);
      const rows = await readSheet(accessToken, spreadsheetId, range);
      const headers = rows.length > 0 ? rows[0] : [];
      const dataRows = rows.length > 1 ? rows.slice(1) : [];
      console.log(`[READ] Done: ${headers.length} cols, ${dataRows.length} data rows`);
      return new Response(JSON.stringify({ headers, rows: dataRows, totalRows: dataRows.length }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Step 2: Parse service account ──
    console.log("[STEP 2] Parsing GOOGLE_SERVICE_ACCOUNT_JSON...");
    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(saJson);
      console.log(`[STEP 2] Service account: ${serviceAccount.client_email}`);
    } catch (parseErr: any) {
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON: " + parseErr.message);
    }

    // ── Step 3: Get Google access token ──
    console.log("[STEP 3] Getting Google access token...");
    const accessToken = await getGoogleAccessToken(serviceAccount);
    console.log("[STEP 3] Token obtained");

    // ── Step 4: Pre-load reference data ──
    console.log("[STEP 4] Pre-loading reference data...");
    const ref = await preloadRefData(supabase);
    console.log(`[STEP 4] Loaded: ${ref.siglaMap.size} siglas, ${ref.nameMap.size} names, ${ref.clientMap.size} clients, ${ref.processMap.size} processes`);

    // Determine which steps to run
    const requestedStep = body?.step;
    const runAll = !requestedStep;
    const stepList = runAll 
      ? ["atividades"] 
      : (requestedStep === "agendamentos" ? ["atividades"] : [requestedStep]);
    
    console.log(`[DISPATCH] Steps to run: ${stepList.join(", ")}`);

    let atividadesResult: any = null;
    let backfillCount = 0;

    for (const step of stepList) {
      if (step === "atividades") {
        // ── Step 6: Process Atividades ──
        console.log("[STEP 6] Processing ATIVIDADES...");
        const atividadesLog = await supabase.from("sync_logs").insert({ sheet_type: "atividades", status: "running" }).select("id").single();
        try {
          atividadesResult = await processAtividadesSheet(accessToken, supabase, ref);
          await supabase.from("sync_logs").update({
            finished_at: new Date().toISOString(),
            rows_found: atividadesResult.found,
            rows_processed: atividadesResult.processed,
            rows_failed: atividadesResult.failed,
            status: atividadesResult.failed > 0 ? "partial" : "success",
            details: { errors: atividadesResult.errors },
          }).eq("id", atividadesLog.data?.id);
        } catch (e: any) {
          console.error("[STEP 6] ATIVIDADES ERROR:", e.message);
          atividadesResult = { found: 0, processed: 0, failed: 0, errors: [e.message] };
          await supabase.from("sync_logs").update({
            finished_at: new Date().toISOString(), status: "error", error_message: e.message,
          }).eq("id", atividadesLog.data?.id);
        }

        // ── Step 7: Retroactive sync - backfill completed_by on old deadlines ──
        console.log("[STEP 7] Backfilling completed_by on old deadlines...");
        try {
          const { data: orphanDeadlines } = await supabase
            .from("process_deadlines")
            .select("id, process_id, data_prazo, ocorrencia")
            .eq("is_completed", true)
            .is("completed_by", null)
            .is("timesheet_entry_id", null)
            .limit(200);

          if (orphanDeadlines && orphanDeadlines.length > 0) {
            const processIds = [...new Set(orphanDeadlines.map((d: any) => d.process_id))];
            const { data: tsEntries } = await supabase
              .from("timesheet_entries")
              .select("id, user_id, process_id, data_atividade")
              .in("process_id", processIds)
              .order("data_atividade", { ascending: false });

            if (tsEntries && tsEntries.length > 0) {
              const tsByProcess = new Map<string, Array<{ id: string; user_id: string; data_atividade: string }>>();
              for (const ts of tsEntries) {
                const list = tsByProcess.get(ts.process_id) || [];
                list.push(ts);
                tsByProcess.set(ts.process_id, list);
              }

              for (const dl of orphanDeadlines) {
                const candidates = tsByProcess.get(dl.process_id);
                if (!candidates) continue;
                const dlDate = new Date(dl.data_prazo + "T00:00:00Z");
                const sevenAfter = new Date(dlDate.getTime() + 7 * 86400000);
                const match = candidates.find(ts => {
                  const tsDate = new Date(ts.data_atividade + "T00:00:00Z");
                  return tsDate >= dlDate && tsDate <= sevenAfter;
                });
                if (match) {
                  const { error } = await supabase.from("process_deadlines").update({
                    completed_by: match.user_id,
                    timesheet_entry_id: match.id,
                  }).eq("id", dl.id);
                  if (!error) backfillCount++;
                }
              }
            }
          }
          console.log(`[STEP 7] Backfilled ${backfillCount} deadlines`);
        } catch (e: any) {
          console.error("[STEP 7] Backfill error:", e.message);
        }
      }
    }

    console.log("[DONE]", JSON.stringify({ atividades: atividadesResult, backfilled: backfillCount }));

    return new Response(JSON.stringify({
      status: "ok", atividades: atividadesResult, backfilled: backfillCount,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("[FATAL]", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
