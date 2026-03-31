import { createClient } from "npm:@supabase/supabase-js@2";

interface SheetSource {
  key: string;
  spreadsheetId: string;
  tab: string;
  filterColumn?: string;
  filterValue?: string;
  label?: string;
}

const SOURCES: SheetSource[] = [
  { key: "pautas_a", spreadsheetId: "1-ku5t5MhZTOy8vKomN3u1SWWf59QJBIBA6DSNY-9vwI", tab: "Pautas", label: "origem:pautas-a" },
  { key: "pautas_b", spreadsheetId: "1_ovrtYhcTf06k6RSJnWlUsi7aHY0LpUMSjIgiLwcJ7U", tab: "Pautas", label: "origem:pautas-b" },
  { key: "pautas_c", spreadsheetId: "19h2MHw6qKgnCV0-8CcpzAP5wmJrWIlpa8hNOQwIyo30", tab: "Pautas", filterColumn: "contador_responsavel", filterValue: "LOMA", label: "origem:pautas-c" },
  { key: "pautas_d", spreadsheetId: "1Nd4P46jXG6lc6dJiwVE6fX05eUl0R5Mwd868NYrp9cA", tab: "Pautas", label: "origem:pautas-d" },
];

const CALC_TYPE_COLS_C = ["acordao", "execucao", "inicial", "sentenca"] as const;
const GITHUB_REPO = "raquel-marquesi/axis-prime-6be4b7a5";
const GITHUB_API = "https://api.github.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getGoogleAccessToken(sa: any, impersonateEmail?: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: sa.client_email,
        ...(impersonateEmail ? { sub: impersonateEmail } : {}),
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    )
  );
  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = base64url(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(`${header}.${payload}`))
  );
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API ${res.status}: ${text}`);
  }
  return (await res.json()).values || [];
}

function normalizeKey(h: string): string {
  return (h || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()\/\\.?!]/g, "")
    .replace(/\s+/g, "_");
}

function buildHeaderMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    map[normalizeKey(h)] = i;
  });
  return map;
}

function getCell(row: string[], hMap: Record<string, number>, ...keys: string[]): string {
  for (const k of keys) {
    const idx = hMap[normalizeKey(k)];
    if (idx !== undefined && row[idx]?.trim()) return row[idx].trim();
  }
  return "";
}

function parseDate(val: string): string | null {
  if (!val) return null;
  const parts = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (parts) {
    const d = parts[1].padStart(2, "0"),
      m = parts[2].padStart(2, "0");
    let y = parts[3];
    if (y.length === 2) y = "20" + y;
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
  if (["SIM", "CUMPRIDO", "CONCLUIDO", "CONCLUÍDA", "ENTREGUE", "OK", "FINALIZADO"].some((s) => upper.includes(s)))
    return "concluida";
  if (["CANCELADO", "CANCELADA"].some((s) => upper.includes(s))) return "cancelada";
  if (["EM ANDAMENTO", "ANDAMENTO", "PARCIAL"].some((s) => upper.includes(s))) return "em_andamento";
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
  const u = combined
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return u.includes("CIVEL") || u.includes("CIVIL") ? "civel" : "trabalhista";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ensureGithubLabels(
  token: string,
  labels: Array<{ name: string; color: string; description?: string }>
): Promise<void> {
  await Promise.allSettled(
    labels.map(async (label) => {
      const check = await fetch(
        `${GITHUB_API}/repos/${GITHUB_REPO}/labels/${encodeURIComponent(label.name)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );
      if (check.status === 404) {
        await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/labels`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({
            name: label.name,
            color: label.color,
            description: label.description ?? "",
          }),
        });
      }
    })
  );
}

async function createGithubIssue(
  token: string,
  title: string,
  body: string,
  labels: string[]
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
    console.error(`[GITHUB] ${res.status}: ${(await res.text()).substring(0, 200)}`);
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

interface ParsedRow {
  idTarefa: string;
  idExterno: string;
  status: "pendente" | "em_andamento" | "concluida" | "cancelada";
  dataLimite: string | null;
  titulo: string;
  subtipo: string;
  observacao: string;
  processoId: string | null;
  processoNumero: string;
  processoParte: string;
  processoParteContraria: string;
  processoCliente: string;
  calculoTipo: string;
  area: "trabalhista" | "civel";
  escritorio: string;
  sourceKey: string;
}

function parseRow(row: string[], hMap: Record<string, number>, source: SheetSource): ParsedRow | null {
  const idTarefa = getCell(row, hMap, "ID da Tarefa", "id_da_tarefa");
  const tipoPauta = getCell(
    row,
    hMap,
    "Tipo de Pauta",
    "tipo_de_pauta",
    "tipo_de_decisao_trabalhista",
    "Tipo de Decisão - Trabalhista"
  );
  const subtipo = getCell(row, hMap, "Subtipo", "Sub Tipo", "sub_tipo");
  const observacao = getCell(
    row,
    hMap,
    "Observação",
    "Observação da Solicitação dos Cálculos",
    "observacao_da_solicitacao_dos_calculos",
    "observacao",
    "Motivo da Solicitação de Cálculos",
    "5_8_motivo_da_solicitacao"
  );
  const statusRaw = getCell(row, hMap, "Status", "status");
  const dataRaw = getCell(row, hMap, "Data", "Data da Decisão", "data_da_decisao", "data");
  const processoIdRaw = getCell(row, hMap, "(Processo) ID", "processo_id");
  const processoNumero = getCell(row, hMap, "(Processo) Número", "processo_numero", "numero_processo");
  const processoParte = getCell(row, hMap, "(Processo) Parte", "processo_parte");
  const processoParteContraria = getCell(row, hMap, "(Processo) Parte Contrária", "processo_parte_contraria");
  const processoCliente = getCell(row, hMap, "(Processo) Cliente", "processo_cliente");
  const idExterno = getCell(row, hMap, "ID Externo", "id_externo");
  const escritorio = getCell(
    row,
    hMap,
    "Escritório",
    "Escritório Externo",
    "Escritório Contador",
    "escritorio"
  );

  if (!idTarefa && !tipoPauta && !processoNumero) return null;

  let calculoTipo = getCell(row, hMap, "Tipo de cálculo", "tipo_de_calculo");
  if (source.key === "pautas_c" && !calculoTipo) {
    for (const col of CALC_TYPE_COLS_C) {
      const val = getCell(row, hMap, col, col.charAt(0).toUpperCase() + col.slice(1));
      if (val && val.trim() !== "") {
        calculoTipo = col.charAt(0).toUpperCase() + col.slice(1);
        break;
      }
    }
  }

  const dataLimite = parseDate(dataRaw);
  const status = mapStatus(statusRaw);
  const area = detectArea(`${tipoPauta} ${subtipo} ${calculoTipo}`);

  let processoId: string | null = null;
  if (processoIdRaw && UUID_RE.test(processoIdRaw)) processoId = processoIdRaw;

  const titulo =
    [tipoPauta, subtipo].filter(Boolean).join(" – ").substring(0, 200) ||
    processoNumero ||
    `Pauta ${source.key}`;

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: any = {};
  try {
    body = await req.clone().json();
  } catch {
    // no body
  }
  const requestedSourceKey: string | null = body?.source_key || null;

  const logId = crypto.randomUUID();
  let totalFound = 0,
    totalProcessed = 0,
    totalFailed = 0,
    totalIssues = 0,
    totalDeadlines = 0;
  const allErrors: string[] = [];

  try {
    await supabase.from("sync_logs").insert({
      id: logId,
      sheet_type: "pautas_github",
      status: "running",
      rows_found: 0,
      rows_processed: 0,
      rows_failed: 0,
    });

    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
    const sa = JSON.parse(saJson);

    // Always use DWD with raquel@marquesi.com.br since the sheets
    // are NOT shared with the service account directly
    const impersonateEmail = Deno.env.get("GOOGLE_IMPERSONATE_EMAIL") || "raquel@marquesi.com.br";
    console.log(`[AUTH] Using DWD impersonation: ${impersonateEmail}`);
    const accessToken = await getGoogleAccessToken(sa, impersonateEmail);

    const allSourceLabels = SOURCES.map((s) => s.label).filter(Boolean) as string[];
    if (githubToken) {
      const standardLabels = [
        { name: "pautas", color: "0075ca", description: "Pauta de agendamento" },
        { name: "prioridade:urgente", color: "d73a4a" },
        { name: "prioridade:alta", color: "e4e669" },
        { name: "prioridade:media", color: "0052cc" },
        { name: "prioridade:baixa", color: "cfd3d7" },
        { name: "area:trabalhista", color: "bfd4f2" },
        { name: "area:civel", color: "d4c5f9" },
        ...allSourceLabels.map((l) => ({ name: l, color: "ededed", description: l })),
      ];
      await ensureGithubLabels(githubToken, standardLabels).catch((e) =>
        console.error("[GITHUB] Label bootstrap:", e.message)
      );
    }

    const [profilesRes, processesRes, calcTypesRes, slaRes, clientsRes, clientAliasesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, sigla").eq("is_active", true),
      supabase.from("processes").select("id, numero_processo, id_cliente").limit(15000),
      supabase.from("calculation_types").select("id, name").eq("is_active", true),
      supabase.from("client_sla_rules").select("client_id, calculation_type, deadline_hours"),
      supabase.from("clients").select("id, nome, razao_social, nome_fantasia"),
      supabase.from("client_aliases").select("alias, client_id"),
    ]);

    const profileById = new Map<string, string>();
    for (const p of profilesRes.data || []) {
      profileById.set(p.user_id, p.full_name || p.sigla || p.user_id);
    }

    const processMap = new Map<string, string>();
    const processClientMap = new Map<string, string>(); // processId → client_id
    for (const p of processesRes.data || []) {
      if (p.numero_processo) processMap.set(p.numero_processo.replace(/[.\-\/\s]/g, ""), p.id);
      processMap.set(p.id, p.id);
      if (p.id_cliente) processClientMap.set(p.id, p.id_cliente);
    }

    const calcTypeMap = new Map<string, string>();
    for (const ct of calcTypesRes.data || []) {
      calcTypeMap.set(ct.name.toLowerCase().trim(), ct.id);
    }

    // Client name → client_id map
    const clientNameMap = new Map<string, string>();
    for (const c of clientsRes.data || []) {
      for (const field of [c.nome, c.razao_social, c.nome_fantasia]) {
        if (field) clientNameMap.set(field.toUpperCase().trim(), c.id);
      }
    }
    for (const a of clientAliasesRes.data || []) {
      if (a.alias) clientNameMap.set(a.alias.toUpperCase().trim(), a.client_id);
    }

    // client_id → SLA rules map
    const clientSlaMap = new Map<string, Array<{ calculation_type: string | null; deadline_hours: number }>>();
    for (const rule of slaRes.data || []) {
      const arr = clientSlaMap.get(rule.client_id) || [];
      arr.push({ calculation_type: rule.calculation_type, deadline_hours: rule.deadline_hours });
      clientSlaMap.set(rule.client_id, arr);
    }

    function applySlaFallback(
      clientId: string | null,
      calculoTipo: string,
      dataReferencia: string | null,
    ): { dataLimite: string; slaHours: number } | null {
      if (!clientId) return null;
      const rules = clientSlaMap.get(clientId);
      if (!rules || rules.length === 0) return null;

      const normCalc = calculoTipo?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";

      // Try matching by calculation_type
      let matched = rules.find((r) => {
        if (!r.calculation_type) return false;
        const normRule = r.calculation_type.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return normCalc.includes(normRule) || normRule.includes(normCalc);
      });

      // Fallback to "Geral" or null calculation_type
      if (!matched) {
        matched = rules.find((r) => !r.calculation_type || r.calculation_type.toUpperCase().trim() === "GERAL");
      }
      if (!matched) matched = rules[0]; // last resort: first rule

      const baseDate = dataReferencia ? new Date(dataReferencia + "T12:00:00Z") : new Date();
      const deadline = new Date(baseDate.getTime() + matched.deadline_hours * 3600000);
      return { dataLimite: deadline.toISOString().substring(0, 10), slaHours: matched.deadline_hours };
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

    const { data: existingRows } = await supabase
      .from("solicitacoes")
      .select("id, id_tarefa_externa, source_type, extracted_details")
      .eq("origem", "planilha_pautas")
      .not("id_tarefa_externa", "is", null);

    const existingMap = new Map<string, { id: string; issueNumber: number | null }>();
    for (const s of existingRows || []) {
      if (s.id_tarefa_externa && s.source_type) {
        const key = `${s.source_type}:${s.id_tarefa_externa}`;
        const issueNumber = (s.extracted_details as any)?.github_issue_number ?? null;
        existingMap.set(key, { id: s.id, issueNumber });
      }
    }

    const activeSources = requestedSourceKey
      ? SOURCES.filter((s) => s.key === requestedSourceKey)
      : SOURCES;

    for (const source of activeSources) {
      console.log(`[${source.key.toUpperCase()}] Reading ${source.spreadsheetId} tab="${source.tab}"`);
      let srcFound = 0,
        srcProcessed = 0,
        srcFailed = 0;

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
          if (source.filterColumn && source.filterValue) {
            const filterVal = getCell(row, hMap, source.filterColumn);
            if (filterVal.toUpperCase() !== source.filterValue.toUpperCase()) continue;
          }

          const parsed = parseRow(row, hMap, source);
          if (!parsed) continue;
          srcFound++;

          const dedupKey = `${source.key}:${parsed.idTarefa}`;
          const existing = parsed.idTarefa ? existingMap.get(dedupKey) : null;
          if (existing?.issueNumber) continue;

          let processId = parsed.processoId;
          if (!processId && parsed.processoNumero) {
            const clean = parsed.processoNumero.replace(/[.\-\/\s]/g, "");
            processId = processMap.get(clean) || null;
          }

          const calcTypeId = resolveCalcType(parsed.calculoTipo);

          let solicitacaoId: string | null = null;
          if (existing && !existing.issueNumber) {
            solicitacaoId = existing.id;
          } else {
            const record = {
              titulo: parsed.titulo,
              descricao: parsed.observacao || null,
              origem: "planilha_pautas" as const,
              source_type: source.key,
              status: parsed.status,
              prioridade: derivePrioridade(parsed.dataLimite),
              process_id: processId,
              assigned_to: null,
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

            if (!inserted.assigned_to) {
              const { error: rpcErr } = await supabase.rpc("assign_calculation", {
                p_solicitacao_id: solicitacaoId,
              });
              if (rpcErr) allErrors.push(`[${source.key}] assign_calculation: ${rpcErr.message}`);
            }

            if (processId && parsed.dataLimite) {
              const ocorrencia = parsed.titulo.substring(0, 120);
              const { error: dlErr } = await supabase.from("process_deadlines").upsert({
                process_id: processId,
                data_prazo: parsed.dataLimite,
                ocorrencia,
                detalhes: parsed.observacao?.substring(0, 500) || null,
                source: "planilha_pautas",
                is_completed: false,
              }, { onConflict: "process_id,data_prazo,ocorrencia", ignoreDuplicates: true });
              if (!dlErr) totalDeadlines++;
              else allErrors.push(`[${source.key}] Deadline: ${dlErr.message}`);
            }
          }

          if (!githubToken) {
            if (allErrors.length === 0 || !allErrors.includes("GITHUB_TOKEN not set")) {
              allErrors.push("GITHUB_TOKEN not set — issues não criadas");
            }
            continue;
          }

          const { data: sol } = await supabase
            .from("solicitacoes")
            .select("assigned_to, prioridade")
            .eq("id", solicitacaoId!)
            .single();
          const assignedName = sol?.assigned_to
            ? profileById.get(sol.assigned_to) ?? "Não atribuído"
            : "Não atribuído";
          const prioridade = sol?.prioridade ?? "media";

          const issueTitle = [
            parsed.titulo,
            parsed.processoNumero ? `Proc. ${parsed.processoNumero}` : null,
            parsed.processoParte || parsed.processoParteContraria || null,
          ]
            .filter(Boolean)
            .join(" | ")
            .substring(0, 200);

          const issueBody = buildIssueBody({
            "ID Tarefa": parsed.idTarefa,
            "Tipo de Pauta": parsed.titulo,
            "Subtipo / Cálculo":
              [parsed.subtipo, parsed.calculoTipo].filter(Boolean).join(", ") || null,
            Prazo: parsed.dataLimite
              ? new Date(parsed.dataLimite + "T12:00:00Z").toLocaleDateString("pt-BR")
              : null,
            Prioridade: prioridade,
            Processo: parsed.processoNumero || null,
            Parte: parsed.processoParte || null,
            "Parte Contrária": parsed.processoParteContraria || null,
            Cliente: parsed.processoCliente || null,
            Escritório: parsed.escritorio || null,
            Atribuído: assignedName,
            Observação: parsed.observacao?.substring(0, 500) || null,
          });

          const issueLabels = [
            "pautas",
            `prioridade:${prioridade}`,
            `area:${parsed.area}`,
            ...(source.label ? [source.label] : []),
          ];

          const issueNumber = await createGithubIssue(githubToken, issueTitle, issueBody, issueLabels);
          if (issueNumber) {
            totalIssues++;
            const { data: currentSol } = await supabase
              .from("solicitacoes")
              .select("extracted_details")
              .eq("id", solicitacaoId!)
              .single();
            const currentDetails = (currentSol?.extracted_details as any) || {};
            await supabase
              .from("solicitacoes")
              .update({
                extracted_details: {
                  ...currentDetails,
                  github_issue_number: issueNumber,
                  github_issue_url: `https://github.com/${GITHUB_REPO}/issues/${issueNumber}`,
                },
              })
              .eq("id", solicitacaoId!);
          }
        }

        totalFound += srcFound;
        totalProcessed += srcProcessed;
        totalFailed += srcFailed;
        console.log(
          `[${source.key.toUpperCase()}] found=${srcFound} processed=${srcProcessed} failed=${srcFailed}`
        );
      } catch (srcErr: any) {
        allErrors.push(`[${source.key}] Fatal: ${srcErr.message}`);
        console.error(`[${source.key.toUpperCase()}] ERROR:`, srcErr.message);
      }
    }

    await supabase
      .from("sync_logs")
      .update({
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
      })
      .eq("id", logId);

    return new Response(
      JSON.stringify({
        found: totalFound,
        processed: totalProcessed,
        failed: totalFailed,
        issues_created: totalIssues,
        deadlines_created: totalDeadlines,
        errors: allErrors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[FATAL]", err.message);
    await supabase
      .from("sync_logs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        rows_found: totalFound,
        rows_processed: totalProcessed,
        rows_failed: totalFailed,
        error_message: err.message,
        details: { errors: allErrors.slice(0, 50) },
      })
      .eq("id", logId);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
