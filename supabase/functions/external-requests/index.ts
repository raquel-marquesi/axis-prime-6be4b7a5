import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ExternalRequestBody {
  titulo: string;
  descricao?: string;
  client_identifier?: string; // CPF or CNPJ
  process_number?: string; // CNJ number
  prioridade?: "baixa" | "media" | "alta" | "urgente";
  data_limite?: string; // ISO date string
}

function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.length === 11;
}

function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, "");
  return cleaned.length === 14;
}

function cleanDocument(doc: string): string {
  return doc.replace(/\D/g, "");
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Validate API key
    const apiKey = req.headers.get("X-API-Key") || req.headers.get("x-api-key") || req.headers.get("MAKE_API") || req.headers.get("make_api");
    const expectedApiKey = Deno.env.get("EXTERNAL_API_KEY");

    if (!expectedApiKey) {
      console.error("EXTERNAL_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing API key" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    let body: ExternalRequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate required fields
    if (!body.titulo || body.titulo.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "titulo is required and must be at least 3 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate prioridade if provided
    const validPrioridades = ["baixa", "media", "alta", "urgente"];
    if (body.prioridade && !validPrioridades.includes(body.prioridade)) {
      return new Response(
        JSON.stringify({ error: `prioridade must be one of: ${validPrioridades.join(", ")}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate data_limite if provided
    if (body.data_limite) {
      const date = new Date(body.data_limite);
      if (isNaN(date.getTime())) {
        return new Response(
          JSON.stringify({ error: "data_limite must be a valid date (ISO format)" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Initialize Supabase with service role key for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to find client by CPF/CNPJ
    let clientId: string | null = null;
    if (body.client_identifier) {
      const cleanedDoc = cleanDocument(body.client_identifier);
      
      if (validateCPF(cleanedDoc)) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id")
          .eq("cpf", cleanedDoc)
          .limit(1)
          .single();
        
        if (clientData) {
          clientId = clientData.id;
        }
      } else if (validateCNPJ(cleanedDoc)) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id")
          .eq("cnpj", cleanedDoc)
          .limit(1)
          .single();
        
        if (clientData) {
          clientId = clientData.id;
        }
      }
    }

    // Try to find process by CNJ number
    let processId: string | null = null;
    if (body.process_number) {
      const { data: processData } = await supabase
        .from("processes")
        .select("id")
        .eq("numero_processo", body.process_number)
        .limit(1)
        .single();
      
      if (processData) {
        processId = processData.id;
      }
    }

    // Create the solicitacao
    const { data: solicitacao, error: insertError } = await supabase
      .from("solicitacoes")
      .insert({
        origem: "api",
        titulo: body.titulo.trim(),
        descricao: body.descricao?.trim() || null,
        client_id: clientId,
        process_id: processId,
        prioridade: body.prioridade || "media",
        data_limite: body.data_limite || null,
        status: "pendente",
      })
      .select("id, titulo, status, prioridade, client_id, process_id, created_at")
      .single();

    if (insertError) {
      console.error("Error creating solicitacao:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create request", details: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`External request created: ${solicitacao.id}`);

    return new Response(
      JSON.stringify({
        id: solicitacao.id,
        status: "created",
        data: {
          titulo: solicitacao.titulo,
          prioridade: solicitacao.prioridade,
          client_found: !!clientId,
          process_found: !!processId,
          created_at: solicitacao.created_at,
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: unknown) {
    console.error("External requests function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
