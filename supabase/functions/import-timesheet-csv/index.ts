import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function norm(s: string | null | undefined): string {
  if (!s) return "";
  return s.toUpperCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  // Try dd/mm/yyyy
  const slash = raw.split("/");
  if (slash.length === 3) {
    const [dd, mm, yyyy] = slash;
    if (yyyy?.length === 4) return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // Try yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.substring(0, 10);
  return null;
}

function parsePeso(peso: string): number {
  if (!peso) return 1;
  const num = parseFloat(peso.replace("%", "").replace(",", ".").trim());
  if (isNaN(num) || num <= 0) return 1;
  return Math.max(1, Math.round(num / 100));
}

// Activity name aliases
const ACTIVITY_ALIASES: Record<string, string> = {
  "CALCULO SEGUNDA HIPOTESE": "CALCULO DE SEGUNDA HIPOTESE",
  "CALCULO ELABORARACAO DE QUESITOS": "CALCULO ELABORACAO DE QUESITOS",
};

// Client name aliases
const CLIENT_ALIASES: Record<string, string> = {
  "LOMA CARREFOUR": "CARREFOUR",
  "LOMA - ASSAI": "ASSAI ATACADISTA",
  "LOMA HEINEKEN": "HEINEKEN",
  "LOMA - BIG - BPSN": "BIG",
  "LOMA - BIG - WMSE": "BIG",
  "LOMA - BIG - WMSO": "BIG",
  "LOMA - BIG - BPBA": "BIG",
  "LOMA - SAINT GOBAIN": "SAINT GOBAIN",
  "LOMA - TELEMONT": "TELEMONT",
  "LOMA - COOP": "COOP",
  "BRA CIVEL": "BANCO BRADESCO",
  "BRADESCO S.A.": "BANCO BRADESCO",
  "DROGASIL": "RAIA DROGASIL",
  "ALVAREZ MARSAL": "ALVAREZ",
  "ERNST YOUNG": "ERNST",
};

// Mapping: CSV tipo_atividade keywords → deadline ocorrencia keywords
const ACTIVITY_DEADLINE_MAP: [string[], string[]][] = [
  [["PRELIMINAR", "INICIAL", "CALCULO GERAL"], ["INICIAL", "PRELIMINAR", "CALCULO GERAL"]],
  [["IMPUGNACAO", "MANIFESTACAO", "CONTESTACAO"], ["IMPUGNACAO", "MANIFESTACAO", "CONTESTACAO"]],
  [["PROVISAO", "SENTENCA"], ["SENTENCA", "PROVISAO"]],
  [["LIQUIDACAO", "EXECUCAO"], ["LIQUIDACAO", "EXECUCAO"]],
  [["ACORDAO"], ["ACORDAO"]],
  [["SEGUNDA HIPOTESE"], ["SEGUNDA HIPOTESE"]],
  [["QUESITOS"], ["QUESITOS"]],
  [["RELATORIO"], ["RELATORIO"]],
];

function matchesDeadline(activityName: string, ocorrencia: string): boolean {
  const aN = norm(activityName);
  const oN = norm(ocorrencia);
  for (const [actKeys, deadKeys] of ACTIVITY_DEADLINE_MAP) {
    const actMatch = actKeys.some(k => aN.includes(k));
    const deadMatch = deadKeys.some(k => oN.includes(k));
    if (actMatch && deadMatch) return true;
  }
  return false;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const csvRows: any[] = body.rows || [];
    const autoClose = body.auto_close_deadlines !== false; // default true

    if (!csvRows.length) {
      return jsonResponse({ error: "No rows provided. Send { rows: [...] }" }, 400);
    }

    // Load lookup tables in parallel
    const [profilesRes, aliasesRes, actTypesRes, clientsRes, clientAliasesRes] = await Promise.all([
      db.from("profiles").select("user_id, full_name"),
      db.from("user_aliases").select("user_id, alias"),
      db.from("activity_types").select("id, name").eq("is_active", true),
      db.from("clients").select("id, nome, razao_social"),
      db.from("client_aliases").select("client_id, alias"),
    ]);

    // Profile map
    const profileMap = new Map<string, string>();
    (profilesRes.data || []).forEach((p: any) => {
      const n = norm(p.full_name);
      if (n) profileMap.set(n, p.user_id);
    });
    (aliasesRes.data || []).forEach((a: any) => {
      const n = norm(a.alias);
      if (n) profileMap.set(n, a.user_id);
    });

    // Activity type map
    const actTypeMap = new Map<string, string>();
    (actTypesRes.data || []).forEach((a: any) => {
      actTypeMap.set(norm(a.name), a.id);
    });
    for (const [alias, canonical] of Object.entries(ACTIVITY_ALIASES)) {
      const id = actTypeMap.get(norm(canonical));
      if (id) actTypeMap.set(norm(alias), id);
    }

    // Client map
    const clientMap = new Map<string, string>();
    (clientsRes.data || []).forEach((c: any) => {
      if (c.nome) clientMap.set(norm(c.nome), c.id);
      if (c.razao_social) clientMap.set(norm(c.razao_social), c.id);
    });
    (clientAliasesRes.data || []).forEach((a: any) => {
      if (a.alias) clientMap.set(norm(a.alias), a.client_id);
    });

    // Process map - load in pages
    let allProcesses: any[] = [];
    let pOff = 0;
    while (true) {
      const { data: pBatch } = await db
        .from("processes")
        .select("id, numero_processo")
        .range(pOff, pOff + 4999);
      if (!pBatch || pBatch.length === 0) break;
      allProcesses = allProcesses.concat(pBatch);
      if (pBatch.length < 5000) break;
      pOff += 5000;
    }
    const processMap = new Map<string, string>();
    allProcesses.forEach((p: any) => {
      if (p.numero_processo) {
        processMap.set(p.numero_processo.replace(/\s+/g, "").trim(), p.id);
      }
    });

    console.log(`Lookups: ${profileMap.size} profiles, ${actTypeMap.size} activities, ${processMap.size} processes, ${clientMap.size} clients`);

    function resolveClient(clientName: string | null): string | null {
      if (!clientName) return null;
      const cn = norm(clientName);
      let id = clientMap.get(cn) || null;
      if (id) return id;
      const aliasTarget = CLIENT_ALIASES[cn] || CLIENT_ALIASES[clientName?.toUpperCase()?.trim() || ""];
      if (aliasTarget) {
        const aN = norm(aliasTarget);
        for (const [key, cid] of clientMap.entries()) {
          if (key.includes(aN) || aN.includes(key)) return cid;
        }
      }
      for (const [key, cid] of clientMap.entries()) {
        if (cn.includes(key) || key.includes(cn)) return cid;
      }
      return null;
    }

    const stats = {
      total: csvRows.length,
      inserted: 0,
      duplicates: 0,
      skipped_no_user: 0,
      skipped_no_date: 0,
      errors: 0,
      deadlines_closed: 0,
      unmatched_users: new Set<string>(),
      unmatched_activities: new Set<string>(),
    };

    // Track which processes had activities (for deadline closure)
    const processActivities = new Map<string, { activityName: string; date: string }[]>();

    const inserts: any[] = [];

    for (const row of csvRows) {
      const profNorm = norm(row.profissional);
      const userId = profileMap.get(profNorm);
      if (!userId) {
        stats.skipped_no_user++;
        if (profNorm) stats.unmatched_users.add(profNorm);
        continue;
      }

      const dataAtividade = parseDate(row.data_lancamento || row.lancamento);
      if (!dataAtividade) { stats.skipped_no_date++; continue; }

      const procNum = (row.numero_processo || "").replace(/\s+/g, "").trim();
      const processId = procNum ? processMap.get(procNum) : null;

      const actNorm = norm(row.tipo_atividade).replace(/ELABORARACAO/g, "ELABORACAO");
      let activityTypeId = actNorm ? actTypeMap.get(actNorm) : null;
      if (!activityTypeId && actNorm) {
        for (const [key, id] of actTypeMap.entries()) {
          if (key.includes(actNorm) || actNorm.includes(key)) {
            activityTypeId = id;
            break;
          }
        }
      }
      if (actNorm && !activityTypeId) stats.unmatched_activities.add(actNorm);

      const clientId = resolveClient(row.cliente);
      const quantidade = parsePeso(row.peso || row.Peso);
      const descricao = (row.descritivo || "").trim();
      const reclamanteNome = (row.parte_contraria || "").trim().toUpperCase() || null;
      const codigoExterno = (row.codigo_externo || "").trim() || null;

      const statusFat = row.status_lancamento?.toLowerCase()?.includes("faturado")
        ? "importado"
        : row.status_lancamento?.toLowerCase()?.includes("nao") || row.status_lancamento?.toLowerCase()?.includes("não")
          ? "nao_importado"
          : null;

      // Generate external_id for dedup
      const extId = row.id || codigoExterno || null;

      inserts.push({
        user_id: userId,
        process_id: processId,
        activity_type_id: activityTypeId,
        data_atividade: dataAtividade,
        descricao,
        reclamante_nome: reclamanteNome,
        quantidade,
        client_id: clientId,
        status_faturamento: statusFat,
        observacao: (row.observacao || "").trim() || null,
        source: "csv_import",
        external_id: extId,
        codigo_externo: codigoExterno,
      });

      // Track for deadline matching
      if (processId && row.tipo_atividade) {
        if (!processActivities.has(processId)) processActivities.set(processId, []);
        processActivities.get(processId)!.push({
          activityName: row.tipo_atividade,
          date: dataAtividade,
        });
      }
    }

    // Insert in batches
    for (let i = 0; i < inserts.length; i += 50) {
      const batch = inserts.slice(i, i + 50);
      const { error: upsertErr } = await db
        .from("timesheet_entries")
        .upsert(batch, { onConflict: "external_id", ignoreDuplicates: true });

      if (upsertErr) {
        for (const entry of batch) {
          const { error: singleErr } = await db.from("timesheet_entries").insert(entry);
          if (singleErr) {
            if (singleErr.message?.includes("duplicate") || singleErr.code === "23505") {
              stats.duplicates++;
            } else {
              stats.errors++;
              if (stats.errors <= 5) console.error("Insert err:", singleErr.message);
            }
          } else {
            stats.inserted++;
          }
        }
      } else {
        stats.inserted += batch.length;
      }
    }

    // Deadline auto-closure
    if (autoClose && processActivities.size > 0) {
      const processIds = [...processActivities.keys()];

      // Load open deadlines for these processes (in batches of 100 process IDs)
      for (let i = 0; i < processIds.length; i += 100) {
        const batchIds = processIds.slice(i, i + 100);
        const { data: openDeadlines } = await db
          .from("process_deadlines")
          .select("id, process_id, ocorrencia, data_prazo")
          .in("process_id", batchIds)
          .eq("is_completed", false);

        if (!openDeadlines || openDeadlines.length === 0) continue;

        for (const deadline of openDeadlines as any[]) {
          const activities = processActivities.get(deadline.process_id);
          if (!activities) continue;

          // Check if any activity matches this deadline
          const matched = activities.find(act => {
            if (!matchesDeadline(act.activityName, deadline.ocorrencia || "")) return false;
            // Check date window: activity within ±30 days of deadline
            if (deadline.data_prazo && act.date) {
              const dDate = new Date(deadline.data_prazo).getTime();
              const aDate = new Date(act.date).getTime();
              const diffDays = Math.abs(dDate - aDate) / (1000 * 60 * 60 * 24);
              return diffDays <= 30;
            }
            return true;
          });

          if (matched) {
            const { error: updateErr } = await db
              .from("process_deadlines")
              .update({
                is_completed: true,
                completed_at: matched.date + "T00:00:00Z",
                details: JSON.stringify({ sla_derived: false, auto_closed_by: "csv_import", activity_date: matched.date }),
              })
              .eq("id", deadline.id);

            if (!updateErr) stats.deadlines_closed++;
          }
        }
      }
    }

    const result = {
      status: "ok",
      stats: {
        total: stats.total,
        inserted: stats.inserted,
        duplicates: stats.duplicates,
        skipped_no_user: stats.skipped_no_user,
        skipped_no_date: stats.skipped_no_date,
        errors: stats.errors,
        deadlines_closed: stats.deadlines_closed,
        unmatched_users: [...stats.unmatched_users].slice(0, 30),
        unmatched_activities: [...stats.unmatched_activities].slice(0, 30),
      },
    };

    console.log("Result:", JSON.stringify(result));
    return jsonResponse(result);
  } catch (error: any) {
    console.error("Fatal:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});
