import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SyncPayload {
  numero_processo: string;
  cliente?: string;
  parte_principal?: string | string[];
  parte_contraria?: string;
  responsavel?: string; // sigla
  quem_agendou?: string; // sigla
  quem_realizou?: string; // sigla
  data_processo?: string;
  data_agenda?: string;
  tipo_agenda?: string;
  descricao?: string;
  data_realizacao?: string;
  ultimo_andamento?: string;
  codigo_externo?: string;
  status?: string;
  id_tarefa?: string;
  urgente?: boolean;
}

async function resolveSigla(supabase: any, sigla: string): Promise<string | null> {
  if (!sigla || !sigla.trim()) return null;
  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("sigla", sigla.trim().toUpperCase())
    .eq("is_active", true)
    .limit(1)
    .single();
  return data?.user_id || null;
}

async function resolveClient(supabase: any, clientName: string): Promise<string | null> {
  if (!clientName || !clientName.trim()) return null;
  const name = clientName.trim();

  // Try exact match first on razao_social or nome_fantasia
  const { data: exact } = await supabase
    .from("clients")
    .select("id")
    .or(`razao_social.ilike.${name},nome_fantasia.ilike.${name},nome.ilike.${name}`)
    .eq("is_active", true)
    .limit(1)
    .single();
  if (exact) return exact.id;

  // Try partial match
  const { data: partial } = await supabase
    .from("clients")
    .select("id")
    .or(`razao_social.ilike.%${name}%,nome_fantasia.ilike.%${name}%,nome.ilike.%${name}%`)
    .eq("is_active", true)
    .limit(1)
    .single();
  return partial?.id || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Validate API key
    const apiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key");
    const expectedApiKey = Deno.env.get("EXTERNAL_API_KEY");

    if (!expectedApiKey) {
      console.error("EXTERNAL_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: SyncPayload;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.numero_processo || body.numero_processo.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "numero_processo is required (min 5 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve siglas in parallel
    const [rawResponsavelId, quemAgendouId, quemRealizouId, clientId] = await Promise.all([
      body.responsavel ? resolveSigla(supabase, body.responsavel) : null,
      body.quem_agendou ? resolveSigla(supabase, body.quem_agendou) : null,
      body.quem_realizou ? resolveSigla(supabase, body.quem_realizou) : null,
      body.cliente ? resolveClient(supabase, body.cliente) : null,
    ]);

    // Smart assignment: if no responsavel resolved and we have a client, use smart_assign_deadline
    let responsavelId = rawResponsavelId;
    let smartAssignFallback = false;

    if (!responsavelId && clientId && body.tipo_agenda) {
      try {
        const { data: assignResult } = await supabase
          .rpc("smart_assign_deadline", { p_client_id: clientId, p_ocorrencia: body.tipo_agenda });
        if (assignResult && assignResult.length > 0 && assignResult[0].user_id) {
          responsavelId = assignResult[0].user_id;
          smartAssignFallback = assignResult[0].is_fallback;
          console.log(`Smart assign: ${responsavelId} (fallback=${smartAssignFallback})`);
        }
      } catch (e: any) {
        console.error("smart_assign_deadline error:", e.message);
      }
    }

    // Find or create process
    const { data: existingProcess } = await supabase
      .from("processes")
      .select("id, id_cliente")
      .eq("numero_processo", body.numero_processo.trim())
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let processId: string;
    let processCreated = false;

    if (existingProcess) {
      processId = existingProcess.id;

      // Update process fields if provided
      const processUpdate: Record<string, any> = {};
      if (body.parte_contraria) processUpdate.reclamante_nome = body.parte_contraria;
      if (body.parte_principal) {
        processUpdate.reclamadas = Array.isArray(body.parte_principal)
          ? body.parte_principal
          : [body.parte_principal];
      }
      if (body.data_processo) processUpdate.data_processo = body.data_processo;
      if (body.codigo_externo) processUpdate.codigo_externo = body.codigo_externo;
      if (clientId && existingProcess.id_cliente !== clientId) processUpdate.id_cliente = clientId;

      if (Object.keys(processUpdate).length > 0) {
        await supabase.from("processes").update(processUpdate).eq("id", processId);
      }
    } else {
      // Need a client to create a process
      if (!clientId) {
        return new Response(
          JSON.stringify({
            error: "Process not found and client could not be resolved. Provide a valid 'cliente' to create a new process.",
            numero_processo: body.numero_processo,
            cliente_searched: body.cliente || null,
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newProcess, error: processError } = await supabase
        .from("processes")
        .insert({
          numero_processo: body.numero_processo.trim(),
          id_cliente: clientId,
          reclamante_nome: body.parte_contraria || "N/A",
          reclamadas: body.parte_principal
            ? Array.isArray(body.parte_principal)
              ? body.parte_principal
              : [body.parte_principal]
            : [],
          tipo_acao: "trabalhista",
          area: "trabalhista",
          data_processo: body.data_processo || null,
          codigo_externo: body.codigo_externo || null,
        })
        .select("id")
        .single();

      if (processError) {
        console.error("Error creating process:", processError);
        return new Response(
          JSON.stringify({ error: "Failed to create process", details: processError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      processId = newProcess.id;
      processCreated = true;

      // Auto-create Drive folder for new process (non-blocking)
      try {
        const { data: clientData } = await supabase
          .from("clients")
          .select("razao_social, nome_fantasia, nome, tipo")
          .eq("id", clientId)
          .single();

        const clientName = clientData?.tipo === "juridica"
          ? clientData.razao_social || clientData.nome_fantasia || "Cliente"
          : clientData?.nome || "Cliente";

        const { data: procData } = await supabase
          .from("processes")
          .select("numero_pasta")
          .eq("id", processId)
          .single();

        const driveResp = await fetch(
          `${supabaseUrl}/functions/v1/google-drive`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              action: "createProcessFolder",
              userEmail: "integracao@marquesi.adv.br",
              clientName,
              processNumber: body.numero_processo,
              folderNumber: procData?.numero_pasta,
            }),
          }
        );

        if (driveResp.ok) {
          const driveData = await driveResp.json();
          if (driveData?.processFolder?.id) {
            await supabase
              .from("processes")
              .update({ drive_folder_id: driveData.processFolder.id })
              .eq("id", processId);
            console.log(`Drive folder created: ${driveData.processFolder.id}`);
          }
        } else {
          console.warn("Drive folder creation returned non-ok:", driveResp.status);
        }
      } catch (driveErr) {
        console.error("Drive folder creation failed (non-blocking):", driveErr);
      }
    }

    // Create deadline if data_agenda is provided
    let deadlineId: string | null = null;
    let deadlineCreated = false;

    if (body.data_agenda && body.tipo_agenda) {
      const isCompleted = body.status?.toLowerCase() === "concluido" ||
        body.status?.toLowerCase() === "concluído" ||
        !!body.data_realizacao;

      const deadlineData: Record<string, any> = {
        process_id: processId,
        data_prazo: body.data_agenda,
        ocorrencia: body.tipo_agenda,
        detalhes: body.descricao || null,
        assigned_to: responsavelId,
        realizado_por: quemAgendouId,
        completed_by: quemRealizouId,
        is_completed: isCompleted,
        completed_at: body.data_realizacao || null,
        ultimo_andamento: body.ultimo_andamento || null,
        urgente: body.urgente ?? false,
        source: body.id_tarefa ? "planilha_cliente" : (smartAssignFallback ? "auto_coordenador" : "planilha_cliente"),
        ...(body.id_tarefa ? { id_tarefa_externa: body.id_tarefa } : {}),
      };

      // Dedup 1: by id_tarefa_externa (primary, if provided)
      let existingDeadline: { id: string } | null = null;

      if (body.id_tarefa) {
        const { data } = await supabase
          .from("process_deadlines")
          .select("id")
          .eq("id_tarefa_externa", body.id_tarefa)
          .limit(1)
          .single();
        existingDeadline = data;
      }

      // Dedup 2: fallback by (process_id, data_prazo, ocorrencia) — any status
      if (!existingDeadline) {
        const { data } = await supabase
          .from("process_deadlines")
          .select("id")
          .eq("process_id", processId)
          .eq("data_prazo", body.data_agenda)
          .eq("ocorrencia", body.tipo_agenda)
          .limit(1)
          .single();
        existingDeadline = data;
      }

      if (existingDeadline) {
        // Update existing deadline with new data
        const updateFields: Record<string, any> = {};
        if (responsavelId) updateFields.assigned_to = responsavelId;
        if (quemAgendouId) updateFields.realizado_por = quemAgendouId;
        if (quemRealizouId) updateFields.completed_by = quemRealizouId;
        if (body.descricao) updateFields.detalhes = body.descricao;
        if (body.ultimo_andamento) updateFields.ultimo_andamento = body.ultimo_andamento;
        if (body.urgente !== undefined) updateFields.urgente = body.urgente;
        if (body.id_tarefa) updateFields.id_tarefa_externa = body.id_tarefa;
        if (isCompleted) {
          updateFields.is_completed = true;
          updateFields.completed_at = body.data_realizacao || new Date().toISOString();
        }

        if (Object.keys(updateFields).length > 0) {
          await supabase.from("process_deadlines").update(updateFields).eq("id", existingDeadline.id);
        }

        deadlineId = existingDeadline.id;
        deadlineCreated = false;
      } else {
        // Insert new deadline
        const { data: newDeadline, error: deadlineError } = await supabase
          .from("process_deadlines")
          .insert(deadlineData)
          .select("id")
          .single();

        if (deadlineError) {
          console.error("Error creating deadline:", deadlineError);
          return new Response(
            JSON.stringify({
              error: "Process saved but failed to create deadline",
              process_id: processId,
              details: deadlineError.message,
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        deadlineId = newDeadline.id;
        deadlineCreated = true;

        // Create calendar event only for NEW non-completed deadlines with assigned user
        if (!isCompleted && responsavelId) {
          const eventDate = new Date(body.data_agenda + "T09:00:00");
          const eventEnd = new Date(body.data_agenda + "T09:15:00");

          await supabase.from("calendar_events").insert({
            user_id: responsavelId,
            title: `[${body.numero_processo}] - ${body.tipo_agenda}`,
            description: `Reclamante: ${body.parte_contraria || "N/A"}\n${body.descricao || ""}`,
            start_at: eventDate.toISOString(),
            end_at: eventEnd.toISOString(),
            event_type: "prazo",
            process_deadline_id: deadlineId,
          });
        }
      }
    }

    console.log(`Sync completed: process=${processId}, deadline=${deadlineId}`);

    return new Response(
      JSON.stringify({
        status: "ok",
        process_id: processId,
        process_created: processCreated,
        deadline_id: deadlineId,
        deadline_created: deadlineCreated,
        smart_assigned: !rawResponsavelId && !!responsavelId,
        smart_assign_fallback: smartAssignFallback,
        lookups: {
          responsavel: { sigla: body.responsavel || null, resolved: !!responsavelId },
          quem_agendou: { sigla: body.quem_agendou || null, resolved: !!quemAgendouId },
          quem_realizou: { sigla: body.quem_realizou || null, resolved: !!quemRealizouId },
          cliente: { name: body.cliente || null, resolved: !!clientId },
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("sync-deadlines error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
