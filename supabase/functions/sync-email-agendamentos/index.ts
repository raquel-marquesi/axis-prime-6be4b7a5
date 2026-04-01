import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SPREADSHEET_ID = "11tvMSgLv0AJ40x3r6IW3VU3aZeCZGnkEj8pAdaD6Sbc";
const SKIP_TABS = ["LISTA_CLIENTES", "FEEDBACK_IA"];

// Column indices (0-based) matching the fixed header:
// ASSUNTO(0) REMETENTE(1) EMAIL_REMETENTE(2) GRUPO/CLIENTE(3) TIPO DE CÁLCULO(4)
// FASE PROCESSUAL(5) Nº PROCESSO (CNJ)(6) GCPJ(7) RECLAMANTE(8) EMPRESA/RÉ(9)
// PRAZO PREVENTIVO(10) PRAZO FATAL(11) RESUMO DO PEDIDO(12) STATUS(13)
// CONFIANÇA IA(14) DATA SOLICITAÇÃO(15) ID_EMAIL(16) LIDO_EM(17)
const COL = {
  ASSUNTO: 0, REMETENTE: 1, EMAIL_REMETENTE: 2, GRUPO_CLIENTE: 3,
  TIPO_CALCULO: 4, FASE_PROCESSUAL: 5, PROCESSO_CNJ: 6, GCPJ: 7,
  RECLAMANTE: 8, EMPRESA_RE: 9, PRAZO_PREVENTIVO: 10, PRAZO_FATAL: 11,
  RESUMO: 12, STATUS: 13, CONFIANCA: 14, DATA_SOLICITACAO: 15,
  ID_EMAIL: 16, LIDO_EM: 17,
};

// ─── Google Auth ───────────────────────────────────────────────────
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

async function readSheet(accessToken: string, range: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API ${res.status}: ${text}`);
  }
  return (await res.json()).values || [];
}

// ─── Helpers ───────────────────────────────────────────────────────
function cell(row: string[], idx: number): string {
  return (row[idx] || "").trim();
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

function mapStatus(val: string): "pendente" | "em_andamento" | "concluida" | "cancelada" {
  const upper = (val || "").toUpperCase();
  if (!upper || upper === "PENDENTE" || upper === "NOVO") return "pendente";
  if (["CONCLUIDO", "CONCLUÍDA", "ENTREGUE", "OK", "FINALIZADO", "SIM"].some(s => upper.includes(s))) return "concluida";
  if (["CANCELADO", "CANCELADA"].some(s => upper.includes(s))) return "cancelada";
  if (["EM ANDAMENTO", "ANDAMENTO", "PARCIAL"].some(s => upper.includes(s))) return "em_andamento";
  return "pendente";
}

function derivePrioridade(dataLimite: string | null): "baixa" | "media" | "alta" | "urgente" {
  if (!dataLimite) return "media";
  const diff = (new Date(dataLimite).getTime() - Date.now()) / 86400000;
  if (diff < 0) return "urgente";
  if (diff <= 3) return "alta";
  if (diff <= 10) return "media";
  return "baixa";
}

function detectArea(tipoCalculo: string, assunto: string): "trabalhista" | "civel" {
  const combined = `${tipoCalculo} ${assunto}`.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (combined.includes("CIVEL") || combined.includes("CIVIL")) return "civel";
  return "trabalhista";
}

// ─── Main Handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const logId = crypto.randomUUID();
  let rowsFound = 0, rowsProcessed = 0, rowsFailed = 0;
  const errors: string[] = [];

  try {
    await supabase.from("sync_logs").insert({
      id: logId, sheet_type: "email_agendamentos", status: "running",
      rows_found: 0, rows_processed: 0, rows_failed: 0,
    });

    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
    const sa = JSON.parse(saJson);
    const accessToken = await getGoogleAccessToken(sa);

    // ─── Load LISTA_CLIENTES to discover tab names ───────────────
    const listaRows = await readSheet(accessToken, "'LISTA_CLIENTES'!A1:B200");
    const tabNames: string[] = [];
    for (let i = 1; i < listaRows.length; i++) {
      const empresa = (listaRows[i]?.[0] || "").trim();
      if (empresa && !SKIP_TABS.includes(empresa.toUpperCase())) {
        // Avoid duplicates (e.g. HEINEKEN appears twice)
        if (!tabNames.includes(empresa)) tabNames.push(empresa);
      }
    }
    console.log(`Found ${tabNames.length} client tabs to process`);

    // ─── Load lookup maps ────────────────────────────────────────
    const { data: clients } = await supabase.from("clients").select("id, nome, razao_social, nome_fantasia");
    const clientMap = new Map<string, string>();
    for (const c of clients || []) {
      for (const f of [c.nome, c.razao_social, c.nome_fantasia]) {
        if (f) clientMap.set(f.toUpperCase().trim(), c.id);
      }
    }
    const { data: aliases } = await supabase.from("client_aliases").select("alias, client_id");
    for (const a of aliases || []) {
      if (a.alias) clientMap.set(a.alias.toUpperCase().trim(), a.client_id);
    }

    const processMap = new Map<string, string>();
    let procOffset = 0;
    const PROC_PAGE = 1000;
    while (true) {
      const { data: procPage } = await supabase
        .from("processes")
        .select("id, numero_processo")
        .range(procOffset, procOffset + PROC_PAGE - 1);
      if (!procPage || procPage.length === 0) break;
      for (const p of procPage) {
        if (p.numero_processo) processMap.set(p.numero_processo.replace(/[.\-\/\s]/g, ""), p.id);
      }
      if (procPage.length < PROC_PAGE) break;
      procOffset += PROC_PAGE;
    }

    const { data: calcTypes } = await supabase.from("calculation_types").select("id, name").eq("is_active", true);
    const calcTypeMap = new Map<string, string>();
    for (const ct of calcTypes || []) {
      calcTypeMap.set(ct.name.toUpperCase().trim(), ct.id);
    }

    // ─── Auto-create process helper ──────────────────────────────
    async function autoCreateProcess(
      numeroCnj: string, clientId: string, reclamante: string, area: "trabalhista" | "civel"
    ): Promise<string | null> {
      try {
        const { data: newProc, error: procErr } = await supabase
          .from("processes")
          .insert({
            numero_processo: numeroCnj.trim(),
            id_cliente: clientId,
            reclamante_nome: reclamante || "N/A",
            tipo_acao: "individual",
            area,
          })
          .select("id, numero_pasta")
          .single();
        if (procErr || !newProc) {
          errors.push(`Auto-create process: ${procErr?.message} (${numeroCnj})`);
          return null;
        }
        processMap.set(numeroCnj.replace(/[.\-\/\s]/g, ""), newProc.id);

        // Create Drive folder (non-blocking)
        try {
          const { data: clientData } = await supabase
            .from("clients").select("razao_social, nome_fantasia, nome, tipo")
            .eq("id", clientId).single();
          const clientName = clientData?.tipo === "juridica"
            ? clientData.razao_social || clientData.nome_fantasia || "Cliente"
            : clientData?.nome || "Cliente";
          const driveResp = await fetch(`${supabaseUrl}/functions/v1/google-drive`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({
              action: "createProcessFolder", userEmail: "integracao@marquesi.adv.br",
              clientName, processNumber: numeroCnj, folderNumber: newProc.numero_pasta,
            }),
          });
          if (driveResp.ok) {
            const driveData = await driveResp.json();
            if (driveData?.processFolder?.id) {
              await supabase.from("processes").update({ drive_folder_id: driveData.processFolder.id }).eq("id", newProc.id);
            }
          }
        } catch (driveErr) {
          console.error("Drive folder creation failed:", driveErr);
        }
        return newProc.id;
      } catch (e: any) {
        errors.push(`Auto-create: ${e.message} (${numeroCnj})`);
        return null;
      }
    }

    // ─── Load existing email_ids for dedup ───────────────────────
    const { data: existing } = await supabase
      .from("solicitacoes")
      .select("email_id")
      .eq("origem", "email_sheet")
      .not("email_id", "is", null);
    const existingEmailIds = new Set<string>();
    for (const s of existing || []) {
      if (s.email_id) existingEmailIds.add(s.email_id);
    }

    // ─── Process each tab ────────────────────────────────────────
    const toInsert: any[] = [];

    for (const tabName of tabNames) {
      try {
        const rows = await readSheet(accessToken, `'${tabName}'!A1:S5000`);
        if (rows.length < 2) continue;

        // Resolve client from tab name
        const clientId = clientMap.get(tabName.toUpperCase()) || null;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const emailId = cell(row, COL.ID_EMAIL);
          const assunto = cell(row, COL.ASSUNTO);
          const processoCnj = cell(row, COL.PROCESSO_CNJ);

          // Skip empty rows
          if (!emailId && !assunto && !processoCnj) continue;
          rowsFound++;

          // Dedup by email_id
          if (emailId && existingEmailIds.has(emailId)) continue;
          if (emailId) existingEmailIds.add(emailId);

          // Resolve process
          let processId: string | null = null;
          if (processoCnj) {
            const clean = processoCnj.replace(/[.\-\/\s]/g, "");
            processId = processMap.get(clean) || null;
          }

          // Resolve calculation type
          const tipoCalculo = cell(row, COL.TIPO_CALCULO);
          let calcTypeId: string | null = null;
          if (tipoCalculo) {
            const key = tipoCalculo.toUpperCase().trim();
            calcTypeId = calcTypeMap.get(key) || null;
            // Fuzzy: try partial match
            if (!calcTypeId) {
              for (const [name, id] of calcTypeMap) {
                if (key.includes(name) || name.includes(key)) {
                  calcTypeId = id;
                  break;
                }
              }
            }
          }

          // Prazo: FATAL takes priority over PREVENTIVO
          const prazoFatal = parseDate(cell(row, COL.PRAZO_FATAL));
          const prazoPreventivo = parseDate(cell(row, COL.PRAZO_PREVENTIVO));
          const dataLimite = prazoFatal || prazoPreventivo;

          const statusRaw = cell(row, COL.STATUS);
          const status = mapStatus(statusRaw);
          const prioridade = derivePrioridade(dataLimite);
          const area = detectArea(tipoCalculo, assunto);

          const reclamante = cell(row, COL.RECLAMANTE);
          const remetente = cell(row, COL.REMETENTE);
          const emailRemetente = cell(row, COL.EMAIL_REMETENTE);
          const resumo = cell(row, COL.RESUMO);
          const dataSolicitacao = parseDate(cell(row, COL.DATA_SOLICITACAO));

          // Auto-create process if CNJ exists but not in DB
          if (!processId && processoCnj && clientId) {
            processId = await autoCreateProcess(processoCnj, clientId, reclamante, area);
          }

          toInsert.push({
            titulo: assunto || `Solicitação ${tabName}`,
            descricao: resumo || null,
            origem: "email_sheet" as const,
            status,
            prioridade,
            client_id: clientId,
            process_id: processId,
            assigned_to: null, // will be assigned via RPC
            data_limite: dataLimite,
            email_id: emailId || null,
            email_from: emailRemetente || null,
            email_subject: assunto || null,
            email_snippet: resumo?.substring(0, 200) || null,
            email_date: dataSolicitacao,
            area,
            calculation_type_id: calcTypeId,
          });
        }
      } catch (tabErr: any) {
        errors.push(`Tab ${tabName}: ${tabErr.message}`);
      }
    }

    console.log(`Rows found: ${rowsFound}, To insert: ${toInsert.length}`);

    // ─── Batch insert + assign_calculation + inline deadlines ──
    let deadlinesCreated = 0;
    const BATCH = 200;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const { data: inserted, error } = await supabase
        .from("solicitacoes").insert(batch).select("id, process_id, data_limite, titulo, descricao, assigned_to");

      if (error) {
        // Fallback: insert one by one
        for (const item of batch) {
          const { data: single, error: sErr } = await supabase
            .from("solicitacoes").insert(item).select("id, process_id, data_limite, titulo, descricao, assigned_to");
          if (sErr) {
            rowsFailed++;
            errors.push(`Insert: ${sErr.message} (${item.titulo?.substring(0, 30)})`);
          } else if (single?.[0]) {
            rowsProcessed++;
            const sol = single[0];
            await supabase.rpc("assign_calculation", { p_solicitacao_id: sol.id });
            // Inline deadline creation
            if (sol.process_id && sol.data_limite) {
              const { error: dlErr } = await supabase
                .from("process_deadlines")
                .upsert({
                  process_id: sol.process_id,
                  data_prazo: sol.data_limite,
                  ocorrencia: (sol.titulo || "Agendamento via e-mail").substring(0, 120),
                  detalhes: sol.descricao?.substring(0, 500) || null,
                  assigned_to: sol.assigned_to || null,
                  source: "planilha_cliente",
                  is_completed: false,
                  solicitacao_id: sol.id,
                }, { onConflict: "process_id,data_prazo,ocorrencia", ignoreDuplicates: true });
              if (!dlErr) deadlinesCreated++;
            }
          }
        }
      } else {
        rowsProcessed += batch.length;
        for (const sol of inserted || []) {
          await supabase.rpc("assign_calculation", { p_solicitacao_id: sol.id });
          // Inline deadline creation
          if (sol.process_id && sol.data_limite) {
            const { error: dlErr } = await supabase
              .from("process_deadlines")
              .upsert({
                process_id: sol.process_id,
                data_prazo: sol.data_limite,
                ocorrencia: (sol.titulo || "Agendamento via e-mail").substring(0, 120),
                detalhes: sol.descricao?.substring(0, 500) || null,
                assigned_to: sol.assigned_to || null,
                source: "planilha_cliente",
                is_completed: false,
                solicitacao_id: sol.id,
              }, { onConflict: "process_id,data_prazo,ocorrencia", ignoreDuplicates: true });
            if (!dlErr) deadlinesCreated++;
          }
        }
      }
    }
    console.log(`Deadlines created/updated: ${deadlinesCreated}`);

    await supabase.from("sync_logs").update({
      status: errors.length > 0 ? "partial" : "success",
      finished_at: new Date().toISOString(),
      rows_found: rowsFound, rows_processed: rowsProcessed, rows_failed: rowsFailed,
      details: { errors: errors.slice(0, 50) },
    }).eq("id", logId);

    return new Response(JSON.stringify({
      found: rowsFound, processed: rowsProcessed, failed: rowsFailed,
      deadlines_created: deadlinesCreated,
      errors: errors.slice(0, 10),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("Fatal error:", err.message);
    await supabase.from("sync_logs").update({
      status: "error", finished_at: new Date().toISOString(),
      rows_found: rowsFound, rows_processed: rowsProcessed, rows_failed: rowsFailed,
      error_message: err.message, details: { errors: errors.slice(0, 50) },
    }).eq("id", logId);

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
