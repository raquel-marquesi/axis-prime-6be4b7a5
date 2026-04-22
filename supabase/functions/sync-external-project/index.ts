import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXTERNAL_PROJECT_URL = "https://pyexbnnuzjcsiypootcq.supabase.co";
const SYNC_TYPE = "external_agendamentos";
const PAGE_SIZE = 1000;
const MAX_RECORDS = 10000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse body for force_full and since params
  let forceFull = false;
  let sinceParam: string | null = null;
  try {
    const body = await req.json();
    forceFull = body?.force_full === true;
    sinceParam = body?.since || null;
  } catch {
    // No body or invalid JSON – use defaults
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");

  if (!externalKey) {
    return new Response(
      JSON.stringify({ error: "EXTERNAL_SUPABASE_SERVICE_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const local = createClient(supabaseUrl, supabaseKey);
  const external = createClient(EXTERNAL_PROJECT_URL, externalKey);

  const mode = forceFull ? "full" : "incremental";

  // Create sync log
  const { data: syncLog } = await local
    .from("sync_logs")
    .insert({ sheet_type: SYNC_TYPE, status: "running" })
    .select("id")
    .single();

  const logId = syncLog?.id;

  try {
    // Determine since date
    let sinceDate: string;
    if (forceFull) {
      sinceDate = sinceParam || "2025-01-01T00:00:00Z";
    } else {
      const { data: lastSync } = await local
        .from("sync_logs")
        .select("finished_at")
        .eq("sheet_type", SYNC_TYPE)
        .eq("status", "success")
        .order("finished_at", { ascending: false })
        .limit(1)
        .single();
      sinceDate = lastSync?.finished_at || "2020-01-01T00:00:00Z";
    }

    // Paginated fetch from external project
    let allAgendamentos: any[] = [];
    let offset = 0;
    while (offset < MAX_RECORDS) {
      const { data: batch, error: fetchError } = await external
        .from("agendamentos")
        .select("*")
        .gte("updated_at", sinceDate)
        .order("updated_at", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (fetchError) {
        throw new Error(`External fetch error (offset ${offset}): ${fetchError.message}`);
      }

      if (!batch || batch.length === 0) break;

      allAgendamentos = allAgendamentos.concat(batch);
      offset += PAGE_SIZE;

      // If we got fewer than PAGE_SIZE, we've reached the end
      if (batch.length < PAGE_SIZE) break;
    }

    if (allAgendamentos.length === 0) {
      await local.from("sync_logs").update({
        status: "success",
        finished_at: new Date().toISOString(),
        rows_found: 0,
        rows_processed: 0,
        rows_failed: 0,
        details: { message: "No new agendamentos", mode },
      }).eq("id", logId);

      return new Response(
        JSON.stringify({ status: "ok", processed: 0, message: "No new records", mode }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Collect unique profissional_ids for batch lookup
    const profIds = [...new Set(allAgendamentos.map(a => a.profissional_id).filter(Boolean))];

    // Fetch profissionais emails from external
    let profEmailMap: Record<string, string> = {};
    if (profIds.length > 0) {
      for (let i = 0; i < profIds.length; i += 50) {
        const chunk = profIds.slice(i, i + 50);
        const { data: profs } = await external
          .from("profissionais")
          .select("id, email")
          .in("id", chunk);
        if (profs) {
          for (const p of profs) {
            if (p.email) profEmailMap[p.id] = p.email.toLowerCase().trim();
          }
        }
      }
    }

    // Fetch local profiles for email mapping
    const uniqueEmails = [...new Set(Object.values(profEmailMap))];
    let emailToUserId: Record<string, string> = {};
    if (uniqueEmails.length > 0) {
      for (let i = 0; i < uniqueEmails.length; i += 50) {
        const chunk = uniqueEmails.slice(i, i + 50);
        const { data: profiles } = await local
          .from("profiles")
          .select("user_id, email")
          .in("email", chunk)
          .eq("is_active", true);
        if (profiles) {
          for (const p of profiles) {
            if (p.email) emailToUserId[p.email.toLowerCase().trim()] = p.user_id;
          }
        }
      }
    }

    // Cache local processes by numero_processo
    const numProcessos = [...new Set(allAgendamentos.map(a => a.numero_processo).filter(Boolean))];
    let processMap: Record<string, string> = {};
    if (numProcessos.length > 0) {
      for (let i = 0; i < numProcessos.length; i += 50) {
        const chunk = numProcessos.slice(i, i + 50);
        const { data: procs } = await local
          .from("processes")
          .select("id, numero_processo")
          .in("numero_processo", chunk);
        if (procs) {
          for (const p of procs) {
            processMap[p.numero_processo] = p.id;
          }
        }
      }
    }

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];
    const skippedNoProcess: string[] = [];

    for (const ag of allAgendamentos) {
      try {
        if (!ag.numero_processo) {
          skippedNoProcess.push(ag.id);
          continue;
        }

        const processId = processMap[ag.numero_processo];
        if (!processId) {
          skippedNoProcess.push(`${ag.id} (proc: ${ag.numero_processo})`);
          continue;
        }

        // Resolve profissional to local user
        let assignedTo: string | null = null;
        if (ag.profissional_id && profEmailMap[ag.profissional_id]) {
          const email = profEmailMap[ag.profissional_id];
          assignedTo = emailToUserId[email] || null;
        }

        const isCompleted = ag.status?.toLowerCase() === "concluido" ||
          ag.status?.toLowerCase() === "concluído" ||
          ag.status?.toLowerCase() === "realizado";

        const deadlineData: Record<string, any> = {
          process_id: processId,
          external_id: ag.id,
          data_prazo: ag.prazo || new Date().toISOString().split("T")[0],
          ocorrencia: ag.fase_processual || "Agendamento externo",
          detalhes: ag.observacoes || null,
          assigned_to: assignedTo,
          is_completed: isCompleted,
          source: "external_sync",
        };

        if (isCompleted && !deadlineData.completed_at) {
          deadlineData.completed_at = ag.updated_at || new Date().toISOString();
        }

        // Check if deadline with this external_id already exists
        const { data: existing } = await local
          .from("process_deadlines")
          .select("id")
          .eq("external_id", ag.id)
          .limit(1)
          .single();

        if (existing) {
          await local
            .from("process_deadlines")
            .update(deadlineData)
            .eq("id", existing.id);
        } else {
          const { error: insertError } = await local
            .from("process_deadlines")
            .insert(deadlineData);

          if (insertError) {
            throw new Error(insertError.message);
          }
        }

        processed++;
      } catch (err: any) {
        failed++;
        errors.push(`${ag.id}: ${err.message}`);
      }
    }

    const finalStatus = failed > 0 && processed === 0 ? "error" : "success";

    await local.from("sync_logs").update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      rows_found: allAgendamentos.length,
      rows_processed: processed,
      rows_failed: failed,
      details: {
        mode,
        since: sinceDate,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
        skipped_no_process: skippedNoProcess.length > 0 ? skippedNoProcess.slice(0, 20) : undefined,
        skipped_count: skippedNoProcess.length,
      },
    }).eq("id", logId);

    console.log(`sync-external-project [${mode}]: found=${allAgendamentos.length}, processed=${processed}, failed=${failed}, skipped=${skippedNoProcess.length}`);

    return new Response(
      JSON.stringify({
        status: "ok",
        mode,
        found: allAgendamentos.length,
        processed,
        failed,
        skipped: skippedNoProcess.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("sync-external-project error:", error);

    if (logId) {
      await local.from("sync_logs").update({
        status: "error",
        finished_at: new Date().toISOString(),
        error_message: error.message,
        details: { mode },
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
