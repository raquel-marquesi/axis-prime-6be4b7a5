import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WebhookPrazoPayload {
  data_prazo: string;
  ocorrencia: string;
  process_id: string;
  detalhes?: string;
  assigned_to?: string | null;
  ultimo_andamento?: string;
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

    // Parse body
    let body: WebhookPrazoPayload;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!body.data_prazo || !body.ocorrencia || !body.process_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: data_prazo, ocorrencia, process_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate date format
    if (isNaN(new Date(body.data_prazo).getTime())) {
      return new Response(
        JSON.stringify({ error: "data_prazo must be a valid date (YYYY-MM-DD)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format for process_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.process_id)) {
      return new Response(
        JSON.stringify({ error: "process_id must be a valid UUID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate assigned_to UUID if provided
    if (body.assigned_to && !uuidRegex.test(body.assigned_to)) {
      return new Response(
        JSON.stringify({ error: "assigned_to must be a valid UUID or null" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize string fields
    const ocorrencia = body.ocorrencia.trim().substring(0, 500);
    const detalhes = body.detalhes?.trim().substring(0, 2000) || null;
    const ultimoAndamento = body.ultimo_andamento?.trim().substring(0, 2000) || null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify process exists
    const { data: process, error: processError } = await supabase
      .from("processes")
      .select("id")
      .eq("id", body.process_id)
      .limit(1)
      .single();

    if (processError || !process) {
      return new Response(
        JSON.stringify({ error: "process_id not found", process_id: body.process_id }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing non-completed deadline (upsert logic)
    // Usando o Hub Central RPC
    const { data: result, error: rpcError } = await supabase.rpc("core_create_deadline", {
      payload: {
        process_id: body.process_id,
        data_prazo: body.data_prazo,
        ocorrencia,
        detalhes,
        assigned_to: body.assigned_to || null,
        ultimo_andamento: ultimoAndamento,
        source: "planilha_cliente"
      }
    });

    if (rpcError || (result && !result.success)) {
      console.error("Error using core RPC:", rpcError || result?.error);
      return new Response(
        JSON.stringify({ error: "Failed to create deadline via core", details: rpcError?.message || result?.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deadlineId = result.id;
    const action = result.action;

    console.log(`webhook-prazos: deadline ${action} id=${deadlineId}`);

    return new Response(
      JSON.stringify({ id: deadlineId, action, process_id: body.process_id }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("webhook-prazos error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
