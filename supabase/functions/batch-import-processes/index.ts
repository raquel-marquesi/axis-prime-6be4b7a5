import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ImportRecord {
  numero_processo: string;
  parte_contraria: string;
  data_agenda: string; // YYYY-MM-DD
  tipo_agenda: string;
  descricao: string;
  codigo_externo: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Service role client for inserts
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { client_id, records } = (await req.json()) as {
      client_id: string;
      records: ImportRecord[];
    };

    if (!client_id || !records?.length) {
      return new Response(
        JSON.stringify({ error: "client_id and records are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let created_processes = 0;
    let created_deadlines = 0;
    let created_events = 0;
    const errors: string[] = [];

    // Cache process IDs to avoid repeated lookups for duplicates
    const processCache: Record<string, string> = {};

    for (const record of records) {
      try {
        let processId = processCache[record.numero_processo];

        if (!processId) {
          // Check if process already exists
          const { data: existing } = await supabase
            .from("processes")
            .select("id")
            .eq("numero_processo", record.numero_processo)
            .maybeSingle();

          if (existing) {
            processId = existing.id;
          } else {
            // Create process
            const { data: newProcess, error: procErr } = await supabase
              .from("processes")
              .insert({
                numero_processo: record.numero_processo,
                reclamante_nome: record.parte_contraria,
                reclamadas: ["BANCO DIGIMAIS S.A."],
                codigo_externo: record.codigo_externo,
                id_cliente: client_id,
                area: "trabalhista",
                tipo_acao: "individual",
                created_by: userId,
              })
              .select("id")
              .single();

            if (procErr) throw new Error(`Processo: ${procErr.message}`);
            processId = newProcess.id;
            created_processes++;
          }
          processCache[record.numero_processo] = processId;
        }

        // Create deadline (ALWAYS)
        const { data: deadline, error: dlErr } = await supabase
          .from("process_deadlines")
          .insert({
            process_id: processId,
            data_prazo: record.data_agenda,
            ocorrencia: record.tipo_agenda,
            detalhes: record.descricao,
          })
          .select("id")
          .single();

        if (dlErr) throw new Error(`Prazo: ${dlErr.message}`);
        created_deadlines++;

        // Create calendar event
        const startAt = `${record.data_agenda}T09:00:00-03:00`;
        const endAt = `${record.data_agenda}T09:15:00-03:00`;

        const { error: evtErr } = await supabase
          .from("calendar_events")
          .insert({
            user_id: userId,
            title: `[${record.numero_processo}] - ${record.tipo_agenda}`,
            description: record.descricao,
            start_at: startAt,
            end_at: endAt,
            event_type: "prazo",
            process_deadline_id: deadline.id,
            all_day: false,
            sync_to_google: false,
          });

        if (evtErr) throw new Error(`Evento: ${evtErr.message}`);
        created_events++;
      } catch (err) {
        errors.push(
          `${record.numero_processo}: ${err instanceof Error ? err.message : JSON.stringify(err)}`
        );
      }
    }

    return new Response(
      JSON.stringify({ created_processes, created_deadlines, created_events, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
