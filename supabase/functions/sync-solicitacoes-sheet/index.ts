import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SPREADSHEET_ID = "1ORp5ThzcGdLIvSEkVgReHSbL5-euIuNT8Gt35Na_k5I";
const GITHUB_REPO = "raquel-marquesi/axis-prime-6be4b7a5";
const GITHUB_API = "https://api.github.com";

const TABS = [
  { name: "PERNAMBUCANAS", client: "PERNAMBUCANAS" },
  { name: "JBS", client: "JBS" },
  { name: "PLURIX", client: "PLURIX" },
  { name: "LEROY MERLIN", client: "LEROY MERLIN" },
  { name: "BANCO ORIGINAL", client: "BANCO ORIGINAL" },
];

// Column name aliases for unified access
const ALIASES: Record<string, string[]> = {
  titulo: ["TIPO DE SOLICITAÇÃO", "SOLICITAÇÃO", "MOTIVO DA SOLICITAÇÃO", "TIPO DE SOLITAÇÃO"],
  descricao: ["DESCRIÇÃO", "OBSERVAÇÃO", "REFERÊNCIA", "OBS"],
  processo: ["Nº PROCESSO", "N° PROCESSO", "PROCESSO", "N° REQUISIÇÃO", "Nº REQUISICAO"],
  pasta: ["PASTA", "N° PASTA"],
  prazo: ["PRAZO ENTREGA", "DATA FATAL", "PRAZO FATAL", "PRAZO"],
  calculista: ["CALCULISTA"],
  reclamante: ["RECLAMANTE", "PARTE CONTRÁRIA", "PARTE CONTRARIA"],
  status: ["RETORNO", "STATUS", "PRAZO CUMPRIDO?", "PRAZO CUMPRIDO"],
  data_solicitacao: ["DATA DA SOLICITAÇÃO", "DATA SOLICITAÇÃO", "DATA", "DATA DA SOLITAÇÃO"],
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
    scope: "https://www.googleapis.com/auth/spreadsheets",
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
  if (!data.access_token) throw new Error("Failed to get Google access token: " + JSON.stringify(data));
  return data.access_token;
}

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

// ─── Helpers ───────────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return (h || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getVal(row: string[], headers: string[], field: string): string {
  const aliases = ALIASES[field] || [field];
  for (const alias of aliases) {
    const norm = normalizeHeader(alias);
    const idx = headers.findIndex(h => normalizeHeader(h) === norm);
    if (idx >= 0 && row[idx]) return row[idx].trim();
  }
  return "";
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

function isMonthSeparator(row: string[]): boolean {
  const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO", "MARCO"];
  const filled = row.filter(c => c && c.trim());
  if (filled.length > 2) return false;
  return filled.some(c => months.includes(c.trim().toUpperCase()));
}

function mapStatus(val: string): "pendente" | "em_andamento" | "concluida" | "cancelada" {
  const upper = (val || "").trim().toUpperCase();
  if (!upper) return "pendente";
  if (["SIM", "CUMPRIDO", "CONCLUIDO", "CONCLUÍDA", "ENTREGUE", "OK", "FINALIZADO"].some(s => upper.includes(s))) return "concluida";
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

// ─── GitHub Issues ─────────────────────────────────────────────────

async function ensureGithubLabel(
  token: string, name: string, color: string
): Promise<void> {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/labels/${encodeURIComponent(name)}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } }
  );
  if (res.status === 404) {
    await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/labels`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
      body: JSON.stringify({ name, color }),
    });
  }
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
    console.error(`[GITHUB] ${res.status}: ${(await res.text()).substring(0, 200)}`);
    return null;
  }
  return (await res.json()).number ?? null;
}

// ─── Main handler ──────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Bootstrap GitHub labels (non-blocking)
  if (githubToken) {
    const labelDefs = [
      { name: "solicitacao", color: "f9d0c4" },
      { name: "prioridade:urgente", color: "d73a4a" },
      { name: "prioridade:alta", color: "e4e669" },
      { name: "prioridade:media", color: "0052cc" },
      { name: "prioridade:baixa", color: "cfd3d7" },
      { name: "area:trabalhista", color: "bfd4f2" },
      { name: "area:civel", color: "d4c5f9" },
    ];
    await Promise.allSettled(labelDefs.map(l => ensureGithubLabel(githubToken, l.name, l.color)));
  }

  const logId = crypto.randomUUID();
  let rowsFound = 0, rowsProcessed = 0, rowsFailed = 0;
  const errors: string[] = [];

  try {
    await supabase.from("sync_logs").insert({
      id: logId,
      sheet_type: "solicitacoes_sheet",
      status: "running",
      rows_found: 0,
      rows_processed: 0,
      rows_failed: 0,
    });

    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
    const sa = JSON.parse(saJson);
    const accessToken = await getGoogleAccessToken(sa);

    // ─── Load client name → id map ───────────────────────────────
    const { data: clients } = await supabase.from("clients").select("id, nome, razao_social, nome_fantasia");
    const clientMap = new Map<string, string>();
    for (const c of clients || []) {
      for (const field of [c.nome, c.razao_social, c.nome_fantasia]) {
        if (field) clientMap.set(field.toUpperCase().trim(), c.id);
      }
    }
    const { data: clientAliases } = await supabase.from("client_aliases").select("alias, client_id");
    for (const a of clientAliases || []) {
      if (a.alias) clientMap.set(a.alias.toUpperCase().trim(), a.client_id);
    }

    // ─── Load profile map (sigla + full_name → user_id) ─────────
    // A coluna CALCULISTA da planilha é a fonte primária de atribuição
    // para os 5 clientes. O fallback inteligente (assign_calculation)
    // só entra quando o calculista não é encontrado ou está vazio.
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, sigla, full_name")
      .eq("is_active", true);
    const profileMap = new Map<string, string>();
    for (const p of profiles || []) {
      if (p.sigla) profileMap.set(p.sigla.toUpperCase().trim(), p.user_id);
      if (p.full_name) profileMap.set(p.full_name.toUpperCase().trim(), p.user_id);
    }
    // Also load user_aliases for non-standard names
    const { data: userAliases } = await supabase
      .from("user_aliases")
      .select("alias, user_id")
      .eq("is_old_user", false);
    for (const ua of userAliases || []) {
      if (ua.alias && ua.user_id) profileMap.set(ua.alias.toUpperCase().trim(), ua.user_id);
    }

    // ─── Load ALL processes for numero_processo resolution ──────
    const processMap = new Map<string, string>();
    const pastaMap = new Map<number, string>();
    let procOffset = 0;
    const PROC_PAGE = 1000;
    while (true) {
      const { data: procPage } = await supabase
        .from("processes")
        .select("id, numero_processo, numero_pasta")
        .range(procOffset, procOffset + PROC_PAGE - 1);
      if (!procPage || procPage.length === 0) break;
      for (const p of procPage) {
        if (p.numero_processo) processMap.set(p.numero_processo.replace(/[.\-\/\s]/g, ""), p.id);
        if (p.numero_pasta) pastaMap.set(p.numero_pasta, p.id);
      }
      if (procPage.length < PROC_PAGE) break;
      procOffset += PROC_PAGE;
    }

    function resolveProcess(numero: string, pasta: string): string | null {
      if (numero) {
        const clean = numero.replace(/[.\-\/\s]/g, "");
        if (processMap.has(clean)) return processMap.get(clean)!;
      }
      if (pasta) {
        const num = parseInt(pasta);
        if (!isNaN(num) && pastaMap.has(num)) return pastaMap.get(num)!;
      }
      return null;
    }

    function resolveCalculista(val: string): string | null {
      if (!val) return null;
      const key = val.toUpperCase().trim();
      return profileMap.get(key) || null;
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
        // Register in local map to avoid re-creation
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

    // ─── Load existing solicitacoes for dedup ────────────────────
    const { data: existing } = await supabase
      .from("solicitacoes")
      .select("id, process_id, titulo, origem")
      .eq("origem", "planilha_5_clientes");
    const existingSet = new Set<string>();
    for (const s of existing || []) {
      if (s.process_id && s.titulo) {
        existingSet.add(`${s.process_id}::${s.titulo.toUpperCase().trim()}`);
      }
    }

    const toInsert: any[] = [];

    for (const tab of TABS) {
      try {
        const rows = await readSheet(accessToken, SPREADSHEET_ID, `'${tab.name}'!A1:Z1000`);
        if (rows.length < 2) continue;

        const headers = rows[0];
        const clientId = clientMap.get(tab.client.toUpperCase()) || null;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          if (isMonthSeparator(row)) continue;

          const processo = getVal(row, headers, "processo");
          const titulo = getVal(row, headers, "titulo");
          if (!processo && !titulo) continue;

          rowsFound++;

          const pasta = getVal(row, headers, "pasta");
          let processId = resolveProcess(processo, pasta);
          const tituloClean = titulo || `Solicitação ${tab.client}`;
          const descricao = getVal(row, headers, "descricao") || null;
          const prazoRaw = getVal(row, headers, "prazo");
          const dataLimite = parseDate(prazoRaw);
          const calculistaRaw = getVal(row, headers, "calculista");
          const assignedTo = resolveCalculista(calculistaRaw);
          const statusRaw = getVal(row, headers, "status");
          const status = mapStatus(statusRaw);
          const prioridade = derivePrioridade(dataLimite);

          // Dedup check
          if (processId && tituloClean) {
            const key = `${processId}::${tituloClean.toUpperCase().trim()}`;
            if (existingSet.has(key)) continue;
            existingSet.add(key);
          }

          // Detect area for BANCO ORIGINAL based on SOLICITAÇÃO column
          let area: "trabalhista" | "civel" = "trabalhista";
          if (tab.client === "BANCO ORIGINAL" && tituloClean) {
            const upper = tituloClean.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (upper.includes("CIVEL") || upper.includes("CIVIL")) {
              area = "civel";
            }
          }

          const reclamante = getVal(row, headers, "reclamante");

          // Auto-create process if CNJ exists but not in DB
          if (!processId && processo && clientId) {
            processId = await autoCreateProcess(processo, clientId, reclamante, area);
          }

          toInsert.push({
            titulo: tituloClean,
            descricao,
            origem: "planilha_5_clientes" as const,
            status,
            prioridade,
            client_id: clientId,
            process_id: processId,
            assigned_to: assignedTo,
            data_limite: dataLimite,
            area,
          });
        }
      } catch (tabErr: any) {
        errors.push(`Tab ${tab.name}: ${tabErr.message}`);
      }
    }

    // ─── Batch insert + fallback inteligente para não-resolvidos ─
    const BATCH = 200;
    const insertedIds: string[] = [];
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const { data: inserted, error } = await supabase.from("solicitacoes").insert(batch).select("id, assigned_to");
      if (error) {
        for (const item of batch) {
          const { data: single, error: singleErr } = await supabase.from("solicitacoes").insert(item).select("id, assigned_to");
          if (singleErr) {
            rowsFailed++;
            errors.push(`Insert: ${singleErr.message} (${item.titulo?.substring(0, 30)})`);
          } else {
            rowsProcessed++;
            if (single?.[0]?.id) {
              insertedIds.push(single[0].id);
              if (!single[0].assigned_to) {
                const { error: rpcErr } = await supabase.rpc("assign_calculation", { p_solicitacao_id: single[0].id });
                if (rpcErr) errors.push(`Assign: ${rpcErr.message} (${item.titulo?.substring(0, 30)})`);
              }
            }
          }
        }
      } else {
        rowsProcessed += batch.length;
        for (const row of inserted || []) {
          insertedIds.push(row.id);
          if (!row.assigned_to) {
            const { error: rpcErr } = await supabase.rpc("assign_calculation", { p_solicitacao_id: row.id });
            if (rpcErr) errors.push(`Assign: ${rpcErr.message}`);
          }
        }
      }
    }

    // ─── Create process_deadlines for records with process_id + data_limite ──
    let deadlinesCreated = 0;
    if (insertedIds.length > 0) {
      for (let i = 0; i < insertedIds.length; i += BATCH) {
        const idBatch = insertedIds.slice(i, i + BATCH);
        const { data: sols } = await supabase
          .from("solicitacoes")
          .select("id, process_id, data_limite, titulo, descricao, assigned_to")
          .in("id", idBatch);

        for (const sol of sols || []) {
          if (!sol.process_id || !sol.data_limite) continue;

          // Dedup by (process_id, data_prazo) only — ignoring ocorrencia text
          const { data: existingDl } = await supabase
            .from("process_deadlines")
            .select("id")
            .eq("process_id", sol.process_id)
            .eq("data_prazo", sol.data_limite)
            .eq("is_completed", false)
            .maybeSingle();

          if (existingDl) continue;

          // Clean ocorrencia: use titulo truncated to a readable length
          const ocorrencia = (sol.titulo || "Solicitação importada").substring(0, 120);

          const { error: dlErr } = await supabase
            .from("process_deadlines")
            .insert({
              process_id: sol.process_id,
              data_prazo: sol.data_limite,
              ocorrencia,
              detalhes: sol.descricao?.substring(0, 500) || null,
              assigned_to: sol.assigned_to || null,
              source: "planilha_cliente",
            });

          if (dlErr) {
            errors.push(`Deadline: ${dlErr.message} (${sol.titulo?.substring(0, 20)})`);
          } else {
            deadlinesCreated++;
          }
        }
      }
    }

    // ─── Create GitHub Issues for new solicitacoes ──────────────────
    let issuesCreated = 0;
    if (githubToken && insertedIds.length > 0) {
      // Fetch all inserted records with their resolved assigned_to
      for (let i = 0; i < insertedIds.length; i += BATCH) {
        const idBatch = insertedIds.slice(i, i + BATCH);
        const { data: sols } = await supabase
          .from("solicitacoes")
          .select("id, titulo, descricao, process_id, prioridade, area, data_limite, assigned_to, extracted_details, client_id")
          .in("id", idBatch);

        // Batch-resolve assigned user names
        const assignedIds = [...new Set((sols || []).map(s => s.assigned_to).filter(Boolean))];
        const { data: assignedProfiles } = assignedIds.length > 0
          ? await supabase.from("profiles").select("user_id, full_name, sigla").in("user_id", assignedIds)
          : { data: [] };
        const userNameMap = new Map<string, string>();
        for (const p of assignedProfiles || []) {
          userNameMap.set(p.user_id, p.full_name || p.sigla || p.user_id);
        }

        // Batch-resolve client names
        const clientIds = [...new Set((sols || []).map(s => s.client_id).filter(Boolean))];
        const { data: clientsData } = clientIds.length > 0
          ? await supabase.from("clients").select("id, nome, razao_social, nome_fantasia").in("id", clientIds)
          : { data: [] };
        const clientNameMap = new Map<string, string>();
        for (const c of clientsData || []) {
          clientNameMap.set(c.id, c.razao_social || c.nome_fantasia || c.nome || c.id);
        }

        const issueResults = await Promise.allSettled(
          (sols || []).map(async (sol) => {
            // Skip if already has a GitHub issue
            if ((sol.extracted_details as any)?.github_issue_number) return;

            const assignedName = sol.assigned_to
              ? (userNameMap.get(sol.assigned_to) ?? "Não atribuído")
              : "Não atribuído";
            const clientName = sol.client_id
              ? (clientNameMap.get(sol.client_id) ?? "—")
              : "—";
            const prazoFmt = sol.data_limite
              ? new Date(sol.data_limite + "T12:00:00Z").toLocaleDateString("pt-BR")
              : "Não informado";

            const issueTitle = `[${clientName}] ${sol.titulo}`.substring(0, 200);
            const issueBody = [
              "## Solicitação de Cálculo",
              "",
              "| Campo | Valor |",
              "|---|---|",
              `| **Cliente** | ${clientName} |`,
              `| **Título** | ${sol.titulo} |`,
              `| **Prazo** | ${prazoFmt} |`,
              `| **Prioridade** | ${sol.prioridade} |`,
              `| **Área** | ${sol.area} |`,
              `| **Atribuído** | ${assignedName} |`,
              ...(sol.descricao ? [`| **Descrição** | ${sol.descricao.substring(0, 300)} |`] : []),
              "",
              "---",
              `*Origem: Planilha 5 clientes · ${new Date().toLocaleDateString("pt-BR")}*`,
            ].join("\n");

            const labels = [
              "solicitacao",
              `prioridade:${sol.prioridade}`,
              `area:${sol.area}`,
            ];

            const issueNumber = await createGithubIssue(githubToken!, issueTitle, issueBody, labels);
            if (issueNumber) {
              issuesCreated++;
              const currentDetails = (sol.extracted_details as any) || {};
              await supabase.from("solicitacoes").update({
                extracted_details: {
                  ...currentDetails,
                  github_issue_number: issueNumber,
                  github_issue_url: `https://github.com/${GITHUB_REPO}/issues/${issueNumber}`,
                },
              }).eq("id", sol.id);
            }
          })
        );

        for (const result of issueResults) {
          if (result.status === "rejected") {
            errors.push(`GitHub Issue: ${(result as PromiseRejectedResult).reason?.message}`);
          }
        }
      }
    }

    await supabase.from("sync_logs").update({
      status: errors.length > 0 ? "partial" : "success",
      finished_at: new Date().toISOString(),
      rows_found: rowsFound,
      rows_processed: rowsProcessed,
      rows_failed: rowsFailed,
      details: { errors: errors.slice(0, 50), issues_created: issuesCreated },
    }).eq("id", logId);

    return new Response(JSON.stringify({
      found: rowsFound,
      processed: rowsProcessed,
      failed: rowsFailed,
      deadlines_created: deadlinesCreated,
      issues_created: issuesCreated,
      errors: errors.slice(0, 10),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    await supabase.from("sync_logs").update({
      status: "error",
      finished_at: new Date().toISOString(),
      rows_found: rowsFound,
      rows_processed: rowsProcessed,
      rows_failed: rowsFailed,
      error_message: err.message,
      details: { errors: errors.slice(0, 50) },
    }).eq("id", logId);

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
