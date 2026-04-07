import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SPREADSHEET_ID = "14HZnCn1bWUSkIOOQPtnxwv79V08s2veNNAUrn0uMQOo";

// ─── Google Auth (same pattern as sync-email-agendamentos) ────────
function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGoogleAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(new TextEncoder().encode(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  })));
  const pem = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = base64url(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(`${header}.${payload}`)));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${header}.${payload}.${sig}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Google token error: " + JSON.stringify(data));
  return data.access_token;
}

async function readSheet(accessToken: string, spreadsheetId: string, range: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`);
  return (await res.json()).values || [];
}

async function getSheetTabs(accessToken: string, spreadsheetId: string): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.sheets || []).map((s: any) => s.properties.title);
}

// ─── Helpers ──────────────────────────────────────────────────────
function normalizeCNJ(val: string): string {
  return (val || "").replace(/[\.\-\s\/]/g, "").trim();
}

function normalizeNameForMatch(val: string): string {
  return (val || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function parseDate(val: string): string | null {
  if (!val) return null;
  const parts = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (parts) {
    const day = parts[1].padStart(2, "0");
    const month = parts[2].padStart(2, "0");
    let year = parts[3];
    if (year.length === 2) year = "20" + year;
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
  const serial = Number(val);
  if (serial > 40000 && serial < 60000) {
    const d = new Date((serial - 25569) * 86400000);
    return d.toISOString().substring(0, 10);
  }
  return null;
}

function daysDiff(d1: string, d2: string): number {
  return Math.abs((new Date(d1).getTime() - new Date(d2).getTime()) / 86400000);
}

// ─── Column mapping ───────────────────────────────────────────────
// Columns: data_lancamento, Peso, data, Dia, Mês, Ano, fechamento,
// numero_processo, profissional, equipe, cliente, filial,
// tipo_atividade, descritivo, observacao, codigo_externo,
// parte_principal, parte_contraria
interface SheetRecord {
  data_lancamento: string | null;
  data: string | null;
  numero_processo: string;
  profissional: string;
  tipo_atividade: string;
  descritivo: string;
  cliente: string;
}

function parseHeader(headerRow: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    const key = h.trim().toLowerCase().replace(/\s+/g, "_");
    map[key] = i;
  });
  return map;
}

function cell(row: string[], idx: number | undefined): string {
  if (idx === undefined) return "";
  return (row[idx] || "").trim();
}

// ─── Main Handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Google auth
    const saRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!saRaw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
    const sa = JSON.parse(saRaw);
    const accessToken = await getGoogleAccessToken(sa);

    // 2. Get all tabs
    const tabs = await getSheetTabs(accessToken, SPREADSHEET_ID);
    console.log(`[sync-baixa-prazos] Found ${tabs.length} tabs: ${tabs.join(", ")}`);

    // 3. Read all rows from all tabs
    const allRecords: SheetRecord[] = [];
    for (const tab of tabs) {
      try {
        const rows = await readSheet(accessToken, SPREADSHEET_ID, `'${tab}'!A1:Z`);
        if (rows.length < 2) continue;
        const colMap = parseHeader(rows[0]);
        
        // Must have numero_processo column
        const procIdx = colMap["numero_processo"] ?? colMap["nº_processo"] ?? colMap["processo"];
        if (procIdx === undefined) {
          console.log(`[sync-baixa-prazos] Tab "${tab}" has no numero_processo column, skipping`);
          continue;
        }

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const cnj = cell(row, procIdx);
          if (!cnj || normalizeCNJ(cnj).length < 10) continue;

          const dataLanc = parseDate(cell(row, colMap["data_lancamento"]));
          const dataVal = parseDate(cell(row, colMap["data"]));
          const effectiveDate = dataLanc || dataVal;
          if (!effectiveDate) continue;

          allRecords.push({
            data_lancamento: effectiveDate,
            data: dataVal,
            numero_processo: cnj,
            profissional: cell(row, colMap["profissional"]),
            tipo_atividade: cell(row, colMap["tipo_atividade"]),
            descritivo: cell(row, colMap["descritivo"]),
            cliente: cell(row, colMap["cliente"]),
          });
        }
      } catch (tabErr) {
        console.error(`[sync-baixa-prazos] Error reading tab "${tab}":`, tabErr);
      }
    }
    console.log(`[sync-baixa-prazos] Parsed ${allRecords.length} production records from sheet`);

    // 4. Index by normalized CNJ
    const byCNJ = new Map<string, SheetRecord[]>();
    for (const rec of allRecords) {
      const key = normalizeCNJ(rec.numero_processo);
      if (!byCNJ.has(key)) byCNJ.set(key, []);
      byCNJ.get(key)!.push(rec);
    }

    // 5. Fetch open deadlines from last 90 days with process info
    const cutoffDate = new Date(Date.now() - 90 * 86400000).toISOString().substring(0, 10);
    const { data: openDeadlines, error: dlErr } = await supabase
      .from("process_deadlines")
      .select("id, process_id, data_prazo, ocorrencia, processes!inner(numero_processo)")
      .eq("is_completed", false)
      .gte("data_prazo", cutoffDate)
      .order("data_prazo", { ascending: true })
      .limit(2000);

    if (dlErr) throw new Error(`Fetch deadlines error: ${dlErr.message}`);
    console.log(`[sync-baixa-prazos] Found ${openDeadlines?.length || 0} open deadlines to check`);

    // 6. Fetch profiles for name matching
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("is_active", true);
    
    const profileMap = new Map<string, string>(); // normalized name -> user_id
    for (const p of (profiles || [])) {
      if (p.full_name) {
        profileMap.set(normalizeNameForMatch(p.full_name), p.user_id);
      }
    }

    // 7. Match and update
    let completed = 0;
    let skipped = 0;
    let noMatch = 0;
    const updates: { id: string; completed_at: string; completed_by: string | null; completion_notes: string }[] = [];

    for (const dl of (openDeadlines || [])) {
      const proc = (dl as any).processes;
      if (!proc?.numero_processo) { skipped++; continue; }

      const key = normalizeCNJ(proc.numero_processo);
      const candidates = byCNJ.get(key);
      if (!candidates || candidates.length === 0) { noMatch++; continue; }

      // Find best match: closest date within ±7 days
      let bestMatch: SheetRecord | null = null;
      let bestDiff = Infinity;
      for (const rec of candidates) {
        const date = rec.data_lancamento!;
        const diff = daysDiff(date, dl.data_prazo);
        if (diff <= 7 && diff < bestDiff) {
          bestDiff = diff;
          bestMatch = rec;
        }
      }

      if (!bestMatch) { noMatch++; continue; }

      // Resolve profissional to user_id
      let completedBy: string | null = null;
      if (bestMatch.profissional) {
        const normName = normalizeNameForMatch(bestMatch.profissional);
        completedBy = profileMap.get(normName) || null;
        
        // Fuzzy: try partial match if exact fails
        if (!completedBy) {
          for (const [pName, pId] of profileMap) {
            if (pName.includes(normName) || normName.includes(pName)) {
              completedBy = pId;
              break;
            }
          }
        }
      }

      const notes = [
        bestMatch.tipo_atividade ? `Atividade: ${bestMatch.tipo_atividade}` : null,
        bestMatch.descritivo ? `Descritivo: ${bestMatch.descritivo.substring(0, 200)}` : null,
        bestMatch.profissional ? `Profissional: ${bestMatch.profissional}` : null,
        `Baixa automática via planilha de produção`,
      ].filter(Boolean).join(" | ");

      updates.push({
        id: dl.id,
        completed_at: bestMatch.data_lancamento!,
        completed_by: completedBy,
        completion_notes: notes,
      });
    }

    // 8. Batch update
    for (const upd of updates) {
      const updateData: any = {
        is_completed: true,
        completed_at: upd.completed_at + "T12:00:00Z",
        updated_at: new Date().toISOString(),
      };
      if (upd.completed_by) updateData.completed_by = upd.completed_by;
      // Store notes in detalhes (append to existing)
      const { data: existing } = await supabase
        .from("process_deadlines")
        .select("detalhes")
        .eq("id", upd.id)
        .single();
      
      const existingNotes = existing?.detalhes || "";
      updateData.detalhes = existingNotes 
        ? `${existingNotes}\n---\n${upd.completion_notes}`
        : upd.completion_notes;

      const { error: updErr } = await supabase
        .from("process_deadlines")
        .update(updateData)
        .eq("id", upd.id);

      if (updErr) {
        console.error(`[sync-baixa-prazos] Error updating deadline ${upd.id}:`, updErr.message);
      } else {
        completed++;
      }
    }

    const summary = {
      total_open_checked: openDeadlines?.length || 0,
      sheet_records: allRecords.length,
      unique_cnjs_in_sheet: byCNJ.size,
      completed,
      skipped,
      no_match: noMatch,
      timestamp: new Date().toISOString(),
    };

    console.log(`[sync-baixa-prazos] Done:`, JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[sync-baixa-prazos] Fatal error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
