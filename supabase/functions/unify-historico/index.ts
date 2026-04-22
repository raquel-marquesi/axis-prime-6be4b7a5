import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseDate(ddmmyyyy: string): string | null {
  if (!ddmmyyyy) return null;
  const parts = ddmmyyyy.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!yyyy || yyyy.length !== 4) return null;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function norm(s: string | null | undefined): string {
  if (!s) return "";
  return s.toUpperCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function parsePeso(peso: string): number {
  if (!peso) return 1;
  const num = parseFloat(peso.replace("%", "").replace(",", ".").trim());
  if (isNaN(num) || num <= 0) return 1;
  return Math.max(1, Math.round(num / 100));
}

const ACTIVITY_ALIASES: Record<string, string> = {
  "CALCULO SEGUNDA HIPOTESE": "CALCULO DE SEGUNDA HIPOTESE",
  "CALCULO ELABORARACAO DE QUESITOS": "CALCULO ELABORACAO DE QUESITOS",
  "CALCULO DE PROVISAO DE ACORDAO": "CALCULO DE PROVISAO DE ACORDAO",
  "CALCULO ELABORACAO DE RELATORIO": "CALCULO ELABORACAO DE RELATORIO",
  "ANALISE PROCESSUAL - DECISOES": "ANALISE PROCESSUAL - DECISOES",
  "DILIGENCIA EXTERNA": "DILIGENCIA EXTERNA",
  "ABERTURA DE PASTAS - LM": "ABERTURA DE PASTAS - LM",
  "REUNIAO": "REUNIAO",
};

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
  "CEC CONSTRUCAO": "CEC CONSTRUCAO",
  "CeC CONTRUÇÃO": "CEC CONSTRUCAO",
  "ALVAREZ MARSAL": "ALVAREZ",
  "ERNST YOUNG": "ERNST",
  "LEROY MERLIN": "LEROY MERLIN",
  "HAPVIDA": "HAPVIDA",
  "OGMO - CALCULOS": "OGMO",
  "SARAK ADVOGADOS": "SARAK",
};

function jsonResponse(data: any, status = 200) {
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
      db: { schema: 'public' },
    });

    const phase = body.phase || "import";
    const batchSize = body.batch_size || 500;
    const startOffset = body.offset || 0;

    if (phase === "create_processes") {
      return await createMissingProcesses(db, batchSize, startOffset);
    }

    return await importHistorico(db, batchSize, startOffset);
  } catch (error: any) {
    console.error("Fatal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function createMissingProcesses(db: any, batchSize: number, startOffset: number) {
  const { data: axisRows, error: axErr } = await db
    .from("historico_axis")
    .select("numero_processo, parte_contraria, parte_principal, cliente")
    .not("numero_processo", "is", null)
    .neq("numero_processo", "")
    .neq("numero_processo", "0")
    .range(startOffset, startOffset + batchSize - 1);

  if (axErr) return jsonResponse({ error: axErr.message }, 500);
  if (!axisRows || axisRows.length === 0) return jsonResponse({ status: "done", phase: "create_processes", inserted: 0, next_offset: null });

  const uniqueNums = [...new Set(axisRows.map((r: any) => r.numero_processo?.replace(/\s+/g, "").trim()).filter(Boolean))];
  const { data: existing } = await db.from("processes").select("numero_processo").in("numero_processo", uniqueNums);
  const existingSet = new Set((existing || []).map((p: any) => p.numero_processo));
  const toCreate = uniqueNums.filter(n => !existingSet.has(n));

  const processMap = new Map<string, any>();
  for (const row of axisRows) {
    const num = row.numero_processo?.replace(/\s+/g, "").trim();
    if (num && toCreate.includes(num) && !processMap.has(num)) {
      processMap.set(num, {
        numero_processo: num,
        reclamante_nome: (row.parte_contraria || "DESCONHECIDO").toUpperCase().trim(),
        tipo_acao: "individual" as const,
        id_cliente: null as string | null,
        area: "trabalhista" as const,
      });
    }
  }

  const { data: clients } = await db.from("clients").select("id, nome, razao_social");
  const { data: aliases } = await db.from("client_aliases").select("alias, client_id");
  const clientLookup = new Map<string, string>();
  (clients || []).forEach((c: any) => {
    if (c.nome) clientLookup.set(norm(c.nome), c.id);
    if (c.razao_social) clientLookup.set(norm(c.razao_social), c.id);
  });
  (aliases || []).forEach((a: any) => {
    if (a.alias) clientLookup.set(norm(a.alias), a.client_id);
  });

  for (const row of axisRows) {
    const num = row.numero_processo?.replace(/\s+/g, "").trim();
    const proc = num ? processMap.get(num) : null;
    if (proc && !proc.id_cliente && row.cliente) {
      const clientNorm = norm(row.cliente);
      let clientId = clientLookup.get(clientNorm);
      if (!clientId) {
        const aliasName = CLIENT_ALIASES[clientNorm] || CLIENT_ALIASES[row.cliente];
        if (aliasName) {
          for (const [key, id] of clientLookup.entries()) {
            if (key.includes(norm(aliasName))) {
              clientId = id;
              break;
            }
          }
        }
      }
      if (!clientId) {
        for (const [key, id] of clientLookup.entries()) {
          if (clientNorm.includes(key) || key.includes(clientNorm)) {
            clientId = id;
            break;
          }
        }
      }
      if (clientId) proc.id_cliente = clientId;
    }
  }

  const { data: fallbackClients } = await db.from("clients").select("id").eq("is_active", true).limit(1);
  const fallbackClientId = fallbackClients?.[0]?.id;

  const inserts: any[] = [];
  for (const proc of processMap.values()) {
    if (!proc.id_cliente) {
      if (!fallbackClientId) continue;
      proc.id_cliente = fallbackClientId;
    }
    inserts.push(proc);
  }

  let inserted = 0;
  for (let i = 0; i < inserts.length; i += 50) {
    const batch = inserts.slice(i, i + 50);
    const { error: insErr } = await db.from("processes").insert(batch);
    if (insErr) {
      for (const p of batch) {
        const { error: singleErr } = await db.from("processes").insert(p);
        if (!singleErr) inserted++;
      }
    } else {
      inserted += batch.length;
    }
  }

  const hasMore = axisRows.length === batchSize;
  return jsonResponse({
    status: "ok",
    phase: "create_processes",
    batch_unique: uniqueNums.length,
    already_existed: existingSet.size,
    inserted,
    next_offset: hasMore ? startOffset + batchSize : null,
  });
}

async function importHistorico(db: any, batchSize: number, startOffset: number) {
  const startTime = Date.now();
  const TIMEOUT = 50_000;

  const [profilesRes, aliasesRes, actTypesRes, clientsRes, clientAliasesRes] = await Promise.all([
    db.from("profiles").select("user_id, full_name"),
    db.from("user_aliases").select("user_id, alias"),
    db.from("activity_types").select("id, name").eq("is_active", true),
    db.from("clients").select("id, nome, razao_social"),
    db.from("client_aliases").select("client_id, alias"),
  ]);

  const profileMap = new Map<string, string>();
  (profilesRes.data || []).forEach((p: any) => {
    const n = norm(p.full_name);
    if (n) profileMap.set(n, p.user_id);
  });
  (aliasesRes.data || []).forEach((a: any) => {
    const n = norm(a.alias);
    if (n) profileMap.set(n, a.user_id);
  });

  const actTypeMap = new Map<string, string>();
  (actTypesRes.data || []).forEach((a: any) => actTypeMap.set(norm(a.name), a.id));
  for (const [alias, canonical] of Object.entries(ACTIVITY_ALIASES)) {
    const id = actTypeMap.get(norm(canonical));
    if (id) actTypeMap.set(norm(alias), id);
  }

  const clientMap = new Map<string, string>();
  (clientsRes.data || []).forEach((c: any) => {
    if (c.nome) clientMap.set(norm(c.nome), c.id);
    if (c.razao_social) clientMap.set(norm(c.razao_social), c.id);
  });
  (clientAliasesRes.data || []).forEach((a: any) => {
    if (a.alias) clientMap.set(norm(a.alias), a.client_id);
  });

  let allProcesses: any[] = [];
  let pOff = 0;
  while (true) {
    const { data: pBatch } = await db.from("processes").select("id, numero_processo").range(pOff, pOff + 4999);
    if (!pBatch || pBatch.length === 0) break;
    allProcesses = allProcesses.concat(pBatch);
    if (pBatch.length < 5000) break;
    pOff += 5000;
  }
  const processMap = new Map<string, string>();
  allProcesses.forEach((p: any) => {
    if (p.numero_processo) processMap.set(p.numero_processo.replace(/\s+/g, "").trim(), p.id);
  });

  console.log(`Lookups: ${profileMap.size} profiles, ${actTypeMap.size} activities, ${processMap.size} processes, ${clientMap.size} clients`);

  const stats = { total: 0, inserted: 0, skipped_no_user: 0, skipped_no_date: 0, duplicates: 0, errors: 0, unmatched_users: new Set<string>(), unmatched_activities: new Set<string>() };

  let offset = startOffset;
  let hasMore = true;

  while (hasMore) {
    if (Date.now() - startTime > TIMEOUT) { console.log(`Timeout at offset ${offset}`); break; }

    const { data: rows, error } = await db.from("historico_axis").select("*", { count: "exact" }).range(offset, offset + batchSize - 1);

    if (error) { console.error("Fetch err:", error.message); break; }
    if (!rows || rows.length === 0) { hasMore = false; break; }

    const inserts: any[] = [];

    for (const row of rows as any[]) {
      stats.total++;
      const profNorm = norm(row.profissional);
      const userId = profileMap.get(profNorm);
      if (!userId) { stats.skipped_no_user++; if (profNorm) stats.unmatched_users.add(profNorm); continue; }

      const dataAtividade = parseDate(row.lancamento);
      if (!dataAtividade) { stats.skipped_no_date++; continue; }

      const procNum = row.numero_processo?.replace(/\s+/g, "")?.trim();
      const processId = procNum ? processMap.get(procNum) : null;
      const actNorm = norm(row.tipo_atividade).replace(/ELABORARACAO/g, "ELABORACAO");
      let activityTypeId = actNorm ? actTypeMap.get(actNorm) : null;
      if (!activityTypeId && actNorm) {
        for (const [key, id] of actTypeMap.entries()) {
          if (key.includes(actNorm) || actNorm.includes(key)) { activityTypeId = id; break; }
        }
      }
      if (actNorm && !activityTypeId) stats.unmatched_activities.add(actNorm);

      const clientNorm = norm(row.cliente);
      let clientId: string | null = null;
      if (clientNorm) {
        clientId = clientMap.get(clientNorm) || null;
        if (!clientId) {
          const aliasTarget = CLIENT_ALIASES[row.cliente?.toUpperCase()?.trim()] || CLIENT_ALIASES[clientNorm];
          if (aliasTarget) {
            const aN = norm(aliasTarget);
            for (const [key, id] of clientMap.entries()) {
              if (key.includes(aN) || aN.includes(key)) { clientId = id; break; }
            }
          }
        }
        if (!clientId) {
          for (const [key, id] of clientMap.entries()) {
            if (clientNorm.includes(key) || key.includes(clientNorm)) { clientId = id; break; }
          }
        }
      }

      inserts.push({
        user_id: userId,
        process_id: processId,
        activity_type_id: activityTypeId,
        data_atividade: dataAtividade,
        descricao: (row.descritivo || "").trim(),
        reclamante_nome: (row.parte_contraria || "").trim().toUpperCase() || null,
        quantidade: parsePeso(row.peso),
        client_id: clientId,
        status_faturamento: row.status_lancamento?.toLowerCase()?.includes("faturado") ? "importado" : row.status_lancamento?.toLowerCase()?.includes("nao") || row.status_lancamento?.toLowerCase()?.includes("não") ? "nao_importado" : null,
        observacao: (row.observacao || "").trim() || null,
        source: "axis_import",
        external_id: row.id || null,
      });
    }

    if (inserts.length > 0) {
      for (let i = 0; i < inserts.length; i += 50) {
        const batch = inserts.slice(i, i + 50);
        const { error: upsertErr } = await db.from("timesheet_entries").upsert(batch, { onConflict: "external_id", ignoreDuplicates: true });
        if (upsertErr) {
          for (const entry of batch) {
            const { error: singleErr } = await db.from("timesheet_entries").insert(entry);
            if (singleErr) {
              if (singleErr.message?.includes("duplicate") || singleErr.code === "23505") { stats.duplicates++; } else { stats.errors++; if (stats.errors <= 5) console.error("Insert err:", singleErr.message); }
            } else { stats.inserted++; }
          }
        } else { stats.inserted += batch.length; }
      }
    }

    if (rows.length < batchSize) hasMore = false;
    else offset += batchSize;
  }

  return jsonResponse({ status: "ok", phase: "import", next_offset: hasMore ? offset : null, stats: { total: stats.total, inserted: stats.inserted, skipped_no_user: stats.skipped_no_user, skipped_no_date: stats.skipped_no_date, duplicates: stats.duplicates, errors: stats.errors, unmatched_users: [...stats.unmatched_users].slice(0, 30), unmatched_activities: [...stats.unmatched_activities].slice(0, 30) } });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
