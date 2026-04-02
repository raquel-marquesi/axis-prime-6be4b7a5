/**
 * sync-pautas-github
 *
 * Reads 'Pautas' tabs from multiple scheduling spreadsheets, creates
 * solicitacoes records in Supabase, distributes assignments via the
 * assign_calculation RPC, creates process_deadlines, and opens a
 * GitHub Issue for each new row.
 *
 * Required Supabase secrets:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  – service account with Sheets read access
 *   GITHUB_TOKEN                 – GitHub PAT with issues:write on the repo
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (auto-injected)
 *
 * Sources:
 *   SHEET_A  1-ku5t5...   aba Pautas  (carga geral / base)
 *   SHEET_B  1_ovrtY...   aba Pautas  (decisões trabalhistas / escritórios externos)
 *   SHEET_C  19h2MH...    aba Pautas  (LOMA filter; calc-type via ACÓRDÃO/EXECUÇÃO/INICIAL/SENTENÇA)
 *   SHEET_D  1Nd4P4...    aba Pautas  (ID Externo + Tipo de cálculo direto)
 */

import { createClient } from "npm:@supabase/supabase-js@2";

// ─── Source definitions ──────────────────────────────────────────────

interface SheetSource {
  /** Short key used as source_type in the DB for dedup/identification */
  key: string;
  spreadsheetId: string;
  tab: string;
  /** Optional: only process rows where the given column equals this value */
  filterColumn?: string;
  filterValue?: string;
  /** Label to append to GitHub Issues */
  label?: string;
}

const SOURCES: SheetSource[] = [
  {
    key: "pautas_a",
    spreadsheetId: "1-ku5t5MhZTOy8vKomN3u1SWWf59QJBIBA6DSNY-9vwI",
    tab: "Pautas",
    label: "origem:pautas-a",
  },
  {
    key: "pautas_b",
    spreadsheetId: "1_ovrtYhcTf06k6RSJnWlUsi7aHY0LpUMSjIgiLwcJ7U",
    tab: "Pautas",
    label: "origem:pautas-b",
  },
  {
    key: "pautas_c",
    spreadsheetId: "19h2MHw6qKgnCV0-8CcpzAP5wmJrWIlpa8hNOQwIyo30",
    tab: "Pautas",
    filterColumn: "contador_responsavel",
    filterValue: "LOMA",
    label: "origem:pautas-c",
  },
  {
    key: "pautas_d",
    spreadsheetId: "1Nd4P46jXG6lc6dJiwVE6fX05eUl0R5Mwd868NYrp9cA",
    tab: "Pautas",
    label: "origem:pautas-d",
  },
];

// Sheet C – columns that identify calculation type (non-empty value = that type)
const CALC_TYPE_COLS_C = ["acordao", "execucao", "inicial", "sentenca"] as const;

const GITHUB_REPO = "raquel-marquesi/axis-prime-6be4b7a5";
const GITHUB_API = "https://api.github.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Google Auth ─────────────────────────────────────────────────────

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
  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = base64url(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(`${header}.${payload}`)
  ));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${header}.${payload}.${sig}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Google token error: " + JSON.stringify(data));
  return data.access_token;
}

async function readSheet(
  accessToken: string, spreadsheetId: string, range: string
): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API ${res.status}: ${text}`);
  }
  return (await res.json()).values || [];
}

// ─── Header / cell helpers ───────────────────────────────────────────

function normalizeKey(h: string): string {
  return (h || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // strip accents
    .replace(/[()\/\\.?!]/g, "")      // strip special chars
    .replace(/\s+/g, "_");
}

function buildHeaderMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => { map[normalizeKey(h)] = i; });
  return map;
}

function getCell(row: string[], hMap: Record<string, number>, ...keys: string[]): string {
  for (const k of keys) {
    const idx = hMap[normalizeKey(k)];
    if (idx !== undefined && row[idx]?.trim()) return row[idx].trim();
  }
  return "";
}

// ─── Date / status / priority helpers ────────────────────────────────

function parseDate(val: string): string | null {
  if (!val) return null;
  const parts = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (parts) {
    const d = parts[1].padStart(2, "0"), m = parts[2].padStart(2, "0");
    let y = parts[3]; if (y.length === 2) y = "20" + y;
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
  const serial = Number(val);
  if (serial > 40000 && serial < 60000)
    return new Date((serial - 25569) * 86400000).toISOString().substring(0, 10);
  return null;
}

function mapStatus(val: string): "pendente" | "em_andamento" | "concluida" | "cancelada" {
  const upper = (val || "").trim().toUpperCase();
  if (!upper) return "pendente";
  if (["SIM","CUMPRIDO","CONCLUIDO","CONCLUÍDA","ENTREGUE","OK","FINALIZADO"].some(s => upper.includes(s))) return "concluida";
  if (["CANCELADO","CANCELADA"].some(s => upper.includes(s))) return "cancelada";
  if (["EM ANDAMENTO","ANDAMENTO","PARCIAL"].some(s => upper.includes(s))) return "em_andamento";
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

function detectArea(combined: string): "trabalhista" | "civel" {
  const u = combined.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return u.includes("CIVEL") || u.includes("CIVIL") ? "civel" : "trabalhista";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── GitHub helpers ──────────────────────────────────────────────────

async function ensureGithubLabels(
  token: string,
  labels: Array<{ name: string; color: string; description?: string }>
): Promise<void> {
  await Promise.allSettled(labels.map(async (label) => {
    const check = await fetch(
      `${GITHUB_API}/repos/${GITHUB_REPO}/labels/${encodeURIComponent(label.name)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } }
    );
    if (check.status === 404) {
      await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/labels`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
        body: JSON.stringify({ name: label.name, color: label.color, description: label.description ?? "" }),
      });
    }
  }));
}

async function createGithubIssue(
  token: string, title: string, body: string, labels: string[]
): Promise<number | null> {
  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ title, body, labels }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[GITHUB] ${res.status}: ${text.substring(0, 200)}`);
    return null;
  }
  return (await res.json()).number ?? null;
}

function buildIssueBody(fields: Record<string, string | null | undefined>): string {
  const rows = Object.entries(fields)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `| **${k}** | ${v} |`);
  return [
    "## Detalhes da Pauta",
    "",
    "| Campo | Valor |",
    "|---|---|",
    ...rows,
    "",
    "---",
    `*Origem: Planilha Pautas · ${new Date().toLocaleDateString("pt-BR")}*`,
  ].join("\n");
}

// ─── Row parser ──────────────────────────────────────────────────────

interface ParsedRow {
  idTarefa: string;
  idExterno: string;
  status: "pendente" | "em_andamento" | "concluida" | "cancelada";
  dataLimite: string | null;
  titulo: string;
  subtipo: string;
  observacao: string;
  processoId: string | null;   // direct UUID if valid
  processoNumero: string;
  processoParte: string;
  processoParteContraria: string;
  processoCliente: string;
  calculoTipo: string;         // resolved from type columns or direct column
  area: "trabalhista" | "civel";
  escritorio: string;
  sourceKey: string;
}

function parseRow(
  row: string[],
  hMap: Record<string, number>,
  source: SheetSource
): ParsedRow | null {
  const idTarefa = getCell(row, hMap, "ID da Tarefa", "id_da_tarefa");
  const tipoPauta = getCell(row, hMap, "Tipo de Pauta", "tipo_de_pauta", "tipo_de_decisao_trabalhista", "Tipo de Decisão - Trabalhista");
  const subtipo = getCell(row, hMap, "Subtipo", "Sub Tipo", "sub_tipo");
  const observacao = getCell(row, hMap,
    "Observação",
    "Observação da Solicitação dos Cálculos",
    "observacao_da_solicitacao_dos_calculos",
    "observacao",
    "Motivo da Solicitação de Cálculos",
    "5_8_motivo_da_solicitacao",
  );
  const statusRaw = getCell(row, hMap, "Status", "status");
  const dataRaw = getCell(row, hMap, "Data", "Data da Decisão", "data_da_decisao", "data");
  const processoIdRaw = getCell(row, hMap, "(Processo) ID", "processo_id");
  const processoNumero = getCell(row, hMap, "(Processo) Número", "processo_numero", "numero_processo");
  const processoParte = getCell(row, hMap, "(Processo) Parte", "processo_parte");
  const processoParteContraria = getCell(row, hMap, "(Processo) Parte Contrária", "processo_parte_contraria");
  const processoCliente = getCell(row, hMap, "(Processo) Cliente", "processo_cliente");
  const idExterno = getCell(row, hMap, "ID Externo", "id_externo");
  const escritorio = getCell(row, hMap, "Escritório", "Escritório Externo", "Escritório Contador", "escritorio");

  // Skip completely empty rows
  if (!idTarefa && !tipoPauta && !processoNumero) return null;

  // Sheet C: Detect calculation type from binary ACÓRDÃO/EXECUÇÃO/INICIAL/SENTENÇA columns
  let calculoTipo = getCell(row, hMap, "Tipo de cálculo", "tipo_de_calculo");
  if (source.key === "pautas_c" && !calculoTipo) {
    for (const col of CALC_TYPE_COLS_C) {
      const val = getCell(row, hMap, col, col.charAt(0).toUpperCase() + col.slice(1));
      if (val && val.trim() !== "") {
        calculoTipo = col.charAt(0).toUpperCase() + col.slice(1); // e.g. "Acordao"
        break;
      }
    }
  }

  const dataLimite = parseDate(dataRaw);
  const status = mapStatus(statusRaw);
  const area = detectArea(`${tipoPauta} ${subtipo} ${calculoTipo}`);

  // Resolve process UUID
  let processoId: string | null = null;
  if (processoIdRaw && UUID_RE.test(processoIdRaw)) processoId = processoIdRaw;

  const titulo = [tipoPauta, subtipo].filter(Boolean).join(" – ").substring(0, 200)
    || processoNumero || `Pauta ${source.key}`;

  return {
    idTarefa,
    idExterno,
    status,
    dataLimite,
    titulo,
    subtipo,
    observacao,
    processoId,
    processoNumero,
    processoParte,
    processoParteContraria,
    processoCliente,
    calculoTipo,
    area,
    escritorio,
    sourceKey: source.key,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Optional: run only a specific source key (body: { source_key: "pautas_c" })
  let body: any = {};
  try { body = await req.clone().json(); } catch { /* no body */ }
  const requestedSourceKey: string | null = body?.source_key || null;

  const logId = crypto.randomUUID();
  let totalFound = 0, totalProcessed = 0, totalFailed = 0,
      totalIssues = 0, totalDeadlines = 0;
  const allErrors: string[] = [];

  try {
    await supabase.from("sync_logs").insert({
      id: logId,
      sheet_type: "pautas_github",
      status: "running",
      rows_found: 0, rows_processed: 0, rows_failed: 0,
    });

    // ── Google auth (one token, re-used for all sheets) ──
    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
    const sa = JSON.parse(saJson);
    const accessToken = await getGoogleAccessToken(sa);

    // ── GitHub labels bootstrap ──
    const allSourceLabels = SOURCES.map(s => s.label).filter(Boolean) as string[];
    if (githubToken) {
      const standardLabels = [
        { name: "pautas", color: "0075ca", description: "Pauta de agendamento" },
        { name: "prioridade:urgente", color: "d73a4a" },
        { name: "prioridade:alta", color: "e4e669" },
        { name: "prioridade:media", color: "0052cc" },
        { name: "prioridade:baixa", color: "cfd3d7" },
        { name: "area:trabalhista", color: "bfd4f2" },
        { name: "area:civel", color: "d4c5f9" },
        ...allSourceLabels.map(l => ({ name: l, color: "ededed", description: l })),
      ];
      await ensureGithubLabels(githubToken, standardLabels)
        .catch(e => console.error("[GITHUB] Label bootstrap:", e.message));
    }

    // ── Pre-load reference data (shared across all sources) ──
    const [profilesRes, calcTypesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, sigla").eq("is_active", true),
      supabase.from("calculation_types").select("id, name").eq("is_active", true),
    ]);

    const profileById = new Map<string, string>();  // user_id → full_name
    for (const p of profilesRes.data || []) {
      profileById.set(p.user_id, p.full_name || p.sigla || p.user_id);
    }

    // Paginated process loading — no limit
    const processMap = new Map<string, string>();
    let procOffset = 0;
    while (true) {
      const { data: procPage } = await supabase
        .from("processes").select("id, numero_processo")
        .range(procOffset, procOffset + 999);
      if (!procPage || procPage.length === 0) break;
      for (const p of procPage) {
        if (p.numero_processo) processMap.set(p.numero_processo.replace(/[.\-\/\s]/g, ""), p.id);
        processMap.set(p.id, p.id);
      }
      if (procPage.length < 1000) break;
      procOffset += 1000;
    }

    // Client map for auto-create process
    const { data: clientsData } = await supabase.from("clients").select("id, nome, razao_social, nome_fantasia");
    const clientMap = new Map<string, string>();
    for (const c of clientsData || []) {
      for (const f of [c.nome, c.razao_social, c.nome_fantasia]) {
        if (f) clientMap.set(f.toUpperCase().trim(), c.id);
      }
    }
    const { data: clientAliases } = await supabase.from("client_aliases").select("alias, client_id");
    for (const a of clientAliases || []) {
      if (a.alias) clientMap.set(a.alias.toUpperCase().trim(), a.client_id);
    }

    const calcTypeMap = new Map<string, string>();  // normalized name → id
    for (const ct of calcTypesRes.data || []) {
      calcTypeMap.set(ct.name.toLowerCase().trim(), ct.id);
    }

    function resolveCalcType(name: string): string | null {
      if (!name) return null;
      const lower = name.toLowerCase().trim();
      const exact = calcTypeMap.get(lower);
      if (exact) return exact;
      for (const [key, id] of calcTypeMap) {
        if (key.includes(lower) || lower.includes(key)) return id;
      }
      return null;
    }

    async function autoCreateProcess(
      numeroCnj: string, clientId: string, reclamante: string, area: "trabalhista" | "civel"
    ): Promise<string | null> {
      try {
        const { data: newProc, error: procErr } = await supabase
          .from("processes")
          .insert({ numero_processo: numeroCnj.trim(), id_cliente: clientId, reclamante_nome: reclamante || "N/A", tipo_acao: "individual", area })
          .select("id, numero_pasta").single();
        if (procErr || !newProc) { allErrors.push(`Auto-create: ${procErr?.message} (${numeroCnj})`); return null; }
        processMap.set(numeroCnj.replace(/[.\-\/\s]/g, ""), newProc.id);
        try {
          const { data: clientData } = await supabase.from("clients").select("razao_social, nome_fantasia, nome, tipo").eq("id", clientId).single();
          const clientName = clientData?.tipo === "juridica" ? clientData.razao_social || clientData.nome_fantasia || "Cliente" : clientData?.nome || "Cliente";
          const driveResp = await fetch(`${supabaseUrl}/functions/v1/google-drive`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({ action: "createProcessFolder", userEmail: "integracao@marquesi.adv.br", clientName, processNumber: numeroCnj, folderNumber: newProc.numero_pasta }),
          });
          if (driveResp.ok) { const d = await driveResp.json(); if (d?.processFolder?.id) await supabase.from("processes").update({ drive_folder_id: d.processFolder.id }).eq("id", newProc.id); }
        } catch (driveErr) { console.error("Drive folder creation failed:", driveErr); }
        return newProc.id;
      } catch (e: any) { allErrors.push(`Auto-create: ${e.message} (${numeroCnj})`); return null; }
    }

    // ── Load existing pautas rows for dedup ──
    // Dedup key: (origem='planilha_pautas', source_type, id_tarefa_externa)
    const { data: existingRows } = await supabase
      .from("solicitacoes")
      .select("id, id_tarefa_externa, source_type, extracted_details")
      .eq("origem", "planilha_pautas")
      .not("id_tarefa_externa", "is", null);

    // Map: "{source_type}:{id_tarefa_externa}" → { id, issueNumber }
    const existingMap = new Map<string, { id: string; issueNumber: number | null }>();
    for (const s of existingRows || []) {
      if (s.id_tarefa_externa && s.source_type) {
        const key = `${s.source_type}:${s.id_tarefa_externa}`;
        const issueNumber = (s.extracted_details as any)?.github_issue_number ?? null;
        existingMap.set(key, { id: s.id, issueNumber });
      }
    }

    // ── Process each source ──
    const activeSources = requestedSourceKey
      ? SOURCES.filter(s => s.key === requestedSourceKey)
      : SOURCES;

    for (const source of activeSources) {
      console.log(`[${source.key.toUpperCase()}] Reading ${source.spreadsheetId} tab="${source.tab}"`);
      let srcFound = 0, srcProcessed = 0, srcFailed = 0;

      try {
        const rows = await readSheet(accessToken, source.spreadsheetId, `'${source.tab}'!A1:AJ3000`);
        if (rows.length < 2) {
          console.log(`[${source.key.toUpperCase()}] No data rows`);
          continue;
        }

        const headers = rows[0];
        const hMap = buildHeaderMap(headers);
        console.log(`[${source.key.toUpperCase()}] ${rows.length - 1} data rows, headers: ${headers.join(", ")}`);

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];

          // Apply source-level row filter (e.g. CONTADOR RESPONSÁVEL = "LOMA")
          if (source.filterColumn && source.filterValue) {
            const filterVal = getCell(row, hMap, source.filterColumn);
            if (filterVal.toUpperCase() !== source.filterValue.toUpperCase()) continue;
          }

          const parsed = parseRow(row, hMap, source);
          if (!parsed) continue;

          srcFound++;

          // Dedup check
          const dedupKey = `${source.key}:${parsed.idTarefa}`;
          const existing = parsed.idTarefa ? existingMap.get(dedupKey) : null;
          if (existing?.issueNumber) continue; // already has a GitHub issue

          // Resolve process ID
          let processId = parsed.processoId; // direct UUID from sheet
          if (!processId && parsed.processoNumero) {
            const clean = parsed.processoNumero.replace(/[.\-\/\s]/g, "");
            processId = processMap.get(clean) || null;
          }
          // Auto-create process if CNJ present but not in DB
          if (!processId && parsed.processoNumero) {
            const clientId = parsed.processoCliente
              ? (clientMap.get(parsed.processoCliente.toUpperCase().trim()) || null)
              : null;
            if (clientId) processId = await autoCreateProcess(parsed.processoNumero, clientId, parsed.processoParte, parsed.area);
          }

          const calcTypeId = resolveCalcType(parsed.calculoTipo);

          let solicitacaoId: string | null = null;

          if (existing && !existing.issueNumber) {
            // Record exists but no issue yet
            solicitacaoId = existing.id;
          } else {
            // Insert new record
            const record = {
              titulo: parsed.titulo,
              descricao: parsed.observacao || null,
              origem: "planilha_pautas" as const,
              source_type: source.key,
              status: parsed.status,
              prioridade: derivePrioridade(parsed.dataLimite),
              process_id: processId,
              assigned_to: null,           // set by assign_calculation RPC
              data_limite: parsed.dataLimite,
              id_tarefa_externa: parsed.idTarefa || parsed.idExterno || null,
              area: parsed.area,
              calculation_type_id: calcTypeId,
              extracted_details: {
                subtipo: parsed.subtipo,
                processo_parte: parsed.processoParte,
                processo_parte_contraria: parsed.processoParteContraria,
                processo_numero: parsed.processoNumero,
                processo_cliente: parsed.processoCliente,
                calculo_tipo_raw: parsed.calculoTipo,
                escritorio: parsed.escritorio,
                source_key: source.key,
                github_issue_number: null,
              },
            };

            const { data: inserted, error: insertErr } = await supabase
              .from("solicitacoes")
              .insert(record)
              .select("id, assigned_to")
              .single();

            if (insertErr) {
              srcFailed++;
              allErrors.push(`[${source.key}] L${i + 1} Insert: ${insertErr.message}`);
              continue;
            }

            solicitacaoId = inserted.id;
            srcProcessed++;

            // ── Assign via workload RPC ──
            if (!inserted.assigned_to) {
              const { error: rpcErr } = await supabase.rpc("assign_calculation", {
                p_solicitacao_id: solicitacaoId,
              });
              if (rpcErr) allErrors.push(`[${source.key}] assign_calculation: ${rpcErr.message}`);
            }

            // ── Create process_deadline ──
            if (processId && parsed.dataLimite) {
              const { data: existingDl } = await supabase
                .from("process_deadlines")
                .select("id")
                .eq("process_id", processId)
                .eq("data_prazo", parsed.dataLimite)
                .eq("is_completed", false)
                .maybeSingle();

              if (!existingDl) {
                const { error: dlErr } = await supabase
                  .from("process_deadlines")
                  .insert({
                    process_id: processId,
                    data_prazo: parsed.dataLimite,
                    ocorrencia: parsed.titulo.substring(0, 120),
                    detalhes: parsed.observacao?.substring(0, 500) || null,
                    source: "planilha_pautas",
                  });
                if (!dlErr) totalDeadlines++;
                else allErrors.push(`[${source.key}] Deadline: ${dlErr.message}`);
              }
            }
          }

          // ── Create GitHub Issue ──
          if (!githubToken) {
            allErrors.push("GITHUB_TOKEN not set");
            continue;
          }

          // Fetch current assigned_to after RPC
          const { data: sol } = await supabase
            .from("solicitacoes")
            .select("assigned_to, prioridade")
            .eq("id", solicitacaoId!)
            .single();

          const assignedName = sol?.assigned_to
            ? (profileById.get(sol.assigned_to) ?? "Não atribuído")
            : "Não atribuído";
          const prioridade = sol?.prioridade ?? "media";

          const issueTitle = [
            parsed.tipoPauta || parsed.titulo,
            parsed.processoNumero ? `Proc. ${parsed.processoNumero}` : null,
            parsed.processoParte || parsed.processoParteContraria || null,
          ].filter(Boolean).join(" | ").substring(0, 200);

          const issueBody = buildIssueBody({
            "ID Tarefa": parsed.idTarefa,
            "Tipo de Pauta": parsed.titulo,
            "Subtipo / Cálculo": [parsed.subtipo, parsed.calculoTipo].filter(Boolean).join(", ") || null,
            "Prazo": parsed.dataLimite
              ? new Date(parsed.dataLimite + "T12:00:00Z").toLocaleDateString("pt-BR")
              : null,
            "Prioridade": prioridade,
            "Processo": parsed.processoNumero || null,
            "Parte": parsed.processoParte || null,
            "Parte Contrária": parsed.processoParteContraria || null,
            "Cliente": parsed.processoCliente || null,
            "Escritório": parsed.escritorio || null,
            "Atribuído": assignedName,
            "Observação": parsed.observacao?.substring(0, 500) || null,
          });

          const issueLabels = [
            "pautas",
            `prioridade:${prioridade}`,
            `area:${parsed.area}`,
            ...(source.label ? [source.label] : []),
          ];

          const issueNumber = await createGithubIssue(
            githubToken, issueTitle, issueBody, issueLabels
          );

          if (issueNumber) {
            totalIssues++;
            // Store issue number back in solicitacao
            const { data: currentSol } = await supabase
              .from("solicitacoes")
              .select("extracted_details")
              .eq("id", solicitacaoId!)
              .single();
            const currentDetails = (currentSol?.extracted_details as any) || {};
            await supabase.from("solicitacoes").update({
              extracted_details: {
                ...currentDetails,
                github_issue_number: issueNumber,
                github_issue_url: `https://github.com/${GITHUB_REPO}/issues/${issueNumber}`,
              },
            }).eq("id", solicitacaoId!);
          }
        }

        totalFound += srcFound;
        totalProcessed += srcProcessed;
        totalFailed += srcFailed;
        console.log(`[${source.key.toUpperCase()}] found=${srcFound} processed=${srcProcessed} failed=${srcFailed}`);
      } catch (srcErr: any) {
        allErrors.push(`[${source.key}] Fatal: ${srcErr.message}`);
        console.error(`[${source.key.toUpperCase()}] ERROR:`, srcErr.message);
      }
    }

    await supabase.from("sync_logs").update({
      status: allErrors.length > 0 ? "partial" : "success",
      finished_at: new Date().toISOString(),
      rows_found: totalFound,
      rows_processed: totalProcessed,
      rows_failed: totalFailed,
      details: {
        issues_created: totalIssues,
        deadlines_created: totalDeadlines,
        errors: allErrors.slice(0, 50),
      },
    }).eq("id", logId);

    return new Response(JSON.stringify({
      found: totalFound,
      processed: totalProcessed,
      failed: totalFailed,
      issues_created: totalIssues,
      deadlines_created: totalDeadlines,
      errors: allErrors.slice(0, 10),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[FATAL]", err.message);
    await supabase.from("sync_logs").update({
      status: "error",
      finished_at: new Date().toISOString(),
      rows_found: totalFound,
      rows_processed: totalProcessed,
      rows_failed: totalFailed,
      error_message: err.message,
      details: { errors: allErrors.slice(0, 50) },
    }).eq("id", logId);

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
