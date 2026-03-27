import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Google Auth (reused from sync-sheets) ─────────────────────────
function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(new TextEncoder().encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  })));
  const pem = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = base64url(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(`${header}.${payload}`)));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${header}.${payload}.${sig}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get Google access token: " + JSON.stringify(data));
  return data.access_token;
}

async function readSheet(accessToken: string, spreadsheetId: string, range: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Sheets API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.values || [];
}

function sheetRowsToObjects(headers: string[], dataRows: string[][]): Record<string, string>[] {
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return dataRows.map(row => {
    const obj: Record<string, string> = {};
    normalizedHeaders.forEach((h, i) => { obj[h] = row[i] || ""; });
    return obj;
  });
}

// --- DB helpers ---
async function resolveByFullName(supabase: any, fullName: string): Promise<string | null> {
  if (!fullName?.trim()) return null;
  const name = fullName.trim();
  const { data: exact } = await supabase
    .from("profiles").select("user_id")
    .ilike("full_name", name)
    .eq("is_active", true).limit(1).single();
  if (exact) return exact.user_id;
  const { data: partial } = await supabase
    .from("profiles").select("user_id")
    .ilike("full_name", `%${name}%`)
    .eq("is_active", true).limit(1).single();
  return partial?.user_id || null;
}

async function resolveSigla(supabase: any, sigla: string): Promise<string | null> {
  if (!sigla?.trim()) return null;
  const { data } = await supabase
    .from("profiles").select("user_id")
    .eq("sigla", sigla.trim().toUpperCase())
    .eq("is_active", true).limit(1).single();
  return data?.user_id || null;
}

async function resolveUser(supabase: any, identifier: string): Promise<string | null> {
  if (!identifier?.trim()) return null;
  const id = identifier.trim();
  if (id.length <= 5 && /^[A-Z]+$/i.test(id)) {
    const bySignal = await resolveSigla(supabase, id);
    if (bySignal) return bySignal;
  }
  return resolveByFullName(supabase, id);
}

async function resolveClient(supabase: any, clientName: string): Promise<string | null> {
  if (!clientName?.trim()) return null;
  const name = clientName.trim();
  const { data: exact } = await supabase
    .from("clients").select("id")
    .or(`razao_social.ilike.${name},nome_fantasia.ilike.${name},nome.ilike.${name}`)
    .eq("is_active", true).limit(1).single();
  if (exact) return exact.id;
  const { data: partial } = await supabase
    .from("clients").select("id")
    .or(`razao_social.ilike.%${name}%,nome_fantasia.ilike.%${name}%,nome.ilike.%${name}%`)
    .eq("is_active", true).limit(1).single();
  return partial?.id || null;
}

async function resolveActivityType(supabase: any, name: string): Promise<string | null> {
  if (!name?.trim()) return null;
  const { data } = await supabase
    .from("activity_types").select("id")
    .ilike("name", `%${name.trim()}%`)
    .eq("is_active", true).limit(1).single();
  return data?.id || null;
}

function parseDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date || (typeof val === "object" && val.getTime)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  if (typeof val === "number") {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().split("T")[0];
  }
  const str = String(val).trim();
  if (!str) return null;
  if (str.includes("T") && str.includes("-")) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
  const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (usMatch) {
    const year = parseInt(usMatch[3]) + 2000;
    return `${year}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  return null;
}

// --- Process agendamentos batch ---
async function processAgendamentos(
  supabase: any, rows: any[]
): Promise<{ created_processes: number; created_deadlines: number; created_events: number; errors: string[] }> {
  let createdProcesses = 0, createdDeadlines = 0, createdEvents = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowLabel = `Agendamento #${i + 1}`;
    try {
      const numProcesso = String(row.numero_processo || "").trim();
      if (!numProcesso || numProcesso.length < 5) {
        errors.push(`${rowLabel}: numero_processo vazio ou invalido`);
        continue;
      }

      const cliente = String(row.cliente || "").trim();
      const parteContraria = String(row.parte_contraria || "").trim();
      const responsavel = String(row.responsavel || "").trim();
      const quemAgendou = String(row.quem_agendou || "").trim();
      const dataAgenda = parseDate(row.data_agenda);
      const tipoAgenda = String(row.tipo_agenda || "").trim();
      const descricao = String(row.descricao || "").trim();
      const quemRealizou = String(row.quem_realizou || "").trim();
      const dataRealizacao = parseDate(row.data_realizacao);
      const ultimoAndamento = String(row.ultimo_andamento || "").trim();
      const codigoExterno = String(row.codigo_externo || "").trim();
      const dataProcesso = parseDate(row.data_processo);
      const partePrincipal = String(row.parte_principal || "").trim();

      const [responsavelId, quemAgendouId, quemRealizouId, clientId] = await Promise.all([
        responsavel ? resolveUser(supabase, responsavel) : null,
        quemAgendou ? resolveUser(supabase, quemAgendou) : null,
        quemRealizou ? resolveUser(supabase, quemRealizou) : null,
        cliente ? resolveClient(supabase, cliente) : null,
      ]);

      const { data: existingProcess } = await supabase
        .from("processes").select("id, id_cliente")
        .eq("numero_processo", numProcesso).limit(1).single();

      let processId: string;
      if (existingProcess) {
        processId = existingProcess.id;
        const upd: Record<string, any> = {};
        if (codigoExterno) upd.codigo_externo = codigoExterno;
        if (dataProcesso) upd.data_processo = dataProcesso;
        if (partePrincipal) upd.reclamadas = [partePrincipal];
        if (Object.keys(upd).length > 0) {
          await supabase.from("processes").update(upd).eq("id", processId);
        }
      } else {
        if (!clientId) {
          errors.push(`${rowLabel}: processo ${numProcesso} nao encontrado e cliente "${cliente}" nao resolvido`);
          continue;
        }
        const { data: newProc, error: procErr } = await supabase
          .from("processes").insert({
            numero_processo: numProcesso,
            id_cliente: clientId,
            reclamante_nome: parteContraria || "N/A",
            tipo_acao: "individual",
            area: "trabalhista",
            codigo_externo: codigoExterno || null,
            data_processo: dataProcesso || null,
            reclamadas: partePrincipal ? [partePrincipal] : [],
          }).select("id").single();
        if (procErr) { errors.push(`${rowLabel}: erro ao criar processo: ${procErr.message}`); continue; }
        processId = newProc.id;
        createdProcesses++;
      }

      if (dataAgenda && tipoAgenda) {
        const isCompleted = !!dataRealizacao;
        const { data: newDeadline, error: dlErr } = await supabase
          .from("process_deadlines").insert({
            process_id: processId,
            data_prazo: dataAgenda,
            ocorrencia: tipoAgenda,
            detalhes: descricao || null,
            assigned_to: responsavelId,
            realizado_por: quemAgendouId,
            completed_by: quemRealizouId,
            is_completed: isCompleted,
            completed_at: dataRealizacao || null,
            ultimo_andamento: ultimoAndamento || null,
          }).select("id").single();

        if (dlErr) { errors.push(`${rowLabel}: erro ao criar prazo: ${dlErr.message}`); continue; }
        createdDeadlines++;

        if (!isCompleted && responsavelId && newDeadline) {
          const eventDate = new Date(dataAgenda + "T09:00:00");
          const eventEnd = new Date(dataAgenda + "T09:15:00");
          await supabase.from("calendar_events").insert({
            user_id: responsavelId,
            title: `[${numProcesso}] - ${tipoAgenda}`,
            description: `Reclamante: ${parteContraria || "N/A"}\n${descricao || ""}`,
            start_at: eventDate.toISOString(),
            end_at: eventEnd.toISOString(),
            event_type: "prazo",
            process_deadline_id: newDeadline.id,
          });
          createdEvents++;
        }
      } else {
        errors.push(`${rowLabel}: data_agenda ou tipo_agenda ausente, prazo nao criado`);
      }
    } catch (e: any) {
      errors.push(`${rowLabel}: ${e.message}`);
    }
  }

  return { created_processes: createdProcesses, created_deadlines: createdDeadlines, created_events: createdEvents, errors };
}

// --- Process timesheet batch ---
async function processTimesheet(
  supabase: any, rows: any[]
): Promise<{ created_entries: number; errors: string[] }> {
  let createdEntries = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowLabel = `Timesheet #${i + 1}`;
    try {
      const profissional = String(row.profissional || "").trim();
      const dataAtividade = parseDate(row.data || row.data_lancamento);
      const descricao = String(row.descritivo || row.descricao || "").trim();
      const numProcesso = String(row.numero_processo || "").trim();
      const tipoAtividade = String(row.tipo_atividade || "").trim();
      const peso = parseInt(String(row.Peso || row.peso || row.quantidade || "1")) || 1;
      const parteContraria = String(row.parte_contraria || row.reclamante || "").trim();
      const codigoExterno = String(row.codigo_externo || "").trim();

      if (!dataAtividade) { errors.push(`${rowLabel}: data invalida`); continue; }
      if (!descricao) { errors.push(`${rowLabel}: descritivo vazio`); continue; }

      const userId = profissional ? await resolveUser(supabase, profissional) : null;
      if (!userId) { errors.push(`${rowLabel}: profissional "${profissional}" nao encontrado`); continue; }

      let processId: string | null = null;
      if (numProcesso && numProcesso.length >= 5) {
        const { data: proc } = await supabase
          .from("processes").select("id")
          .eq("numero_processo", numProcesso).limit(1).single();
        processId = proc?.id || null;

        if (proc && codigoExterno) {
          await supabase.from("processes").update({ codigo_externo: codigoExterno }).eq("id", proc.id);
        }
      }

      let activityTypeId: string | null = null;
      if (tipoAtividade) {
        activityTypeId = await resolveActivityType(supabase, tipoAtividade);
      }

      const { error: tsErr } = await supabase.from("timesheet_entries").insert({
        user_id: userId,
        process_id: processId,
        activity_type_id: activityTypeId,
        data_atividade: dataAtividade,
        descricao: descricao,
        quantidade: peso,
        reclamante_nome: parteContraria || null,
      });

      if (tsErr) { errors.push(`${rowLabel}: ${tsErr.message}`); continue; }
      createdEntries++;
    } catch (e: any) {
      errors.push(`${rowLabel}: ${e.message}`);
    }
  }

  return { created_entries: createdEntries, errors };
}

// --- Process timesheet with reconciliation ---
interface OpenDeadline {
  id: string;
  process_id: string;
  numero_processo: string;
  data_prazo: string;
  ocorrencia: string | null;
  reconciled: boolean;
}

async function loadOpenDeadlines(supabase: any): Promise<OpenDeadline[]> {
  const { data, error } = await supabase
    .from("process_deadlines")
    .select("id, process_id, data_prazo, ocorrencia, processes!inner(numero_processo)")
    .eq("is_completed", false)
    .limit(5000);

  if (error) {
    console.error("Error loading open deadlines:", error.message);
    return [];
  }

  return (data || []).map((d: any) => ({
    id: d.id,
    process_id: d.process_id,
    numero_processo: d.processes?.numero_processo || "",
    data_prazo: d.data_prazo,
    ocorrencia: d.ocorrencia,
    reconciled: false,
  }));
}

function findBestDeadlineMatch(
  deadlines: OpenDeadline[],
  numProcesso: string,
  dataAtividade: string
): OpenDeadline | null {
  const candidates = deadlines.filter(
    d => d.numero_processo === numProcesso && !d.reconciled
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Sort by date proximity to data_atividade
  const actDate = new Date(dataAtividade).getTime();
  candidates.sort((a, b) => {
    const diffA = Math.abs(new Date(a.data_prazo).getTime() - actDate);
    const diffB = Math.abs(new Date(b.data_prazo).getTime() - actDate);
    return diffA - diffB;
  });

  return candidates[0];
}

async function processTimesheetWithReconcile(
  supabase: any, rows: any[], openDeadlines: OpenDeadline[]
): Promise<{ created_entries: number; reconciled_deadlines: number; errors: string[] }> {
  let createdEntries = 0;
  let reconciledDeadlines = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowLabel = `Timesheet #${i + 1}`;
    try {
      const profissional = String(row.profissional || "").trim();
      const dataAtividade = parseDate(row.data || row.data_lancamento);
      const descricao = String(row.descritivo || row.descricao || "").trim();
      const numProcesso = String(row.numero_processo || "").trim();
      const tipoAtividade = String(row.tipo_atividade || "").trim();
      const peso = parseInt(String(row.Peso || row.peso || row.quantidade || "1")) || 1;
      const parteContraria = String(row.parte_contraria || row.reclamante || "").trim();
      const codigoExterno = String(row.codigo_externo || "").trim();

      if (!dataAtividade) { errors.push(`${rowLabel}: data invalida`); continue; }
      if (!descricao) { errors.push(`${rowLabel}: descritivo vazio`); continue; }

      const userId = profissional ? await resolveUser(supabase, profissional) : null;
      if (!userId) { errors.push(`${rowLabel}: profissional "${profissional}" nao encontrado`); continue; }

      let processId: string | null = null;
      if (numProcesso && numProcesso.length >= 5) {
        const { data: proc } = await supabase
          .from("processes").select("id")
          .eq("numero_processo", numProcesso).limit(1).single();
        processId = proc?.id || null;

        if (proc && codigoExterno) {
          await supabase.from("processes").update({ codigo_externo: codigoExterno }).eq("id", proc.id);
        }
      }

      let activityTypeId: string | null = null;
      if (tipoAtividade) {
        activityTypeId = await resolveActivityType(supabase, tipoAtividade);
      }

      const { data: newEntry, error: tsErr } = await supabase.from("timesheet_entries").insert({
        user_id: userId,
        process_id: processId,
        activity_type_id: activityTypeId,
        data_atividade: dataAtividade,
        descricao: descricao,
        quantidade: peso,
        reclamante_nome: parteContraria || null,
      }).select("id").single();

      if (tsErr) { errors.push(`${rowLabel}: ${tsErr.message}`); continue; }
      createdEntries++;

      // Reconciliation: try to match and close an open deadline
      if (processId && numProcesso && newEntry) {
        const match = findBestDeadlineMatch(openDeadlines, numProcesso, dataAtividade);
        if (match) {
          const { error: updErr } = await supabase
            .from("process_deadlines")
            .update({
              is_completed: true,
              completed_at: dataAtividade,
              completed_by: userId,
            })
            .eq("id", match.id);

          if (!updErr) {
            match.reconciled = true;
            reconciledDeadlines++;
          }
        }
      }
    } catch (e: any) {
      errors.push(`${rowLabel}: ${e.message}`);
    }
  }

  return { created_entries: createdEntries, reconciled_deadlines: reconciledDeadlines, errors };
}

// --- Main handler ---
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { type, source } = body;

    // ── Source: Google Sheet ──
    let rows: any[];
    if (source === "sheet") {
      const { spreadsheetId, range } = body;
      if (!spreadsheetId || !range || !type) {
        return new Response(JSON.stringify({ error: "spreadsheetId, range, and type required for source=sheet" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`Reading sheet ${spreadsheetId} range=${range} for type=${type}`);
      const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
      if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
      const serviceAccount = JSON.parse(saJson);
      const accessToken = await getGoogleAccessToken(serviceAccount);
      const sheetData = await readSheet(accessToken, spreadsheetId, range);
      if (sheetData.length < 2) {
        return new Response(JSON.stringify({ error: "Sheet has no data rows" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const headers = sheetData[0];
      const dataRows = sheetData.slice(1).filter(r => r.some(c => c?.trim()));
      rows = sheetRowsToObjects(headers, dataRows);
      console.log(`Sheet parsed: ${rows.length} rows, headers: ${headers.join(", ")}`);
    } else {
      rows = body.rows;
      if (!type || !rows || !Array.isArray(rows)) {
        return new Response(JSON.stringify({ error: "type and rows[] required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`Processing bulk-import-data: type=${type}, rows=${rows.length}`);

    let result: any;
    if (type === "agendamentos") {
      result = await processAgendamentos(supabase, rows);
    } else if (type === "timesheet") {
      result = await processTimesheet(supabase, rows);
    } else if (type === "timesheet-reconcile") {
      // Load all open deadlines once for the entire batch
      const openDeadlines = await loadOpenDeadlines(supabase);
      console.log(`Loaded ${openDeadlines.length} open deadlines for reconciliation`);
      result = await processTimesheetWithReconcile(supabase, rows, openDeadlines);
    } else {
      return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "ok", ...result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("bulk-import-data error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
