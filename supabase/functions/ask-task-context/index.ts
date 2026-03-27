import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { solicitacao_id, user_message } = await req.json();
    if (!solicitacao_id) {
      return new Response(JSON.stringify({ error: "solicitacao_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch solicitacao with relations
    const { data: sol, error: solError } = await supabase
      .from("solicitacoes")
      .select(`
        *,
        client:clients!client_id (nome, razao_social),
        process:processes!process_id (numero_processo, numero_pasta, reclamante_nome, reclamadas, area),
        calculation_type:calculation_types!calculation_type_id (name, estimated_complexity)
      `)
      .eq("id", solicitacao_id)
      .single();

    if (solError || !sol) {
      return new Response(JSON.stringify({ error: "Solicitação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientName = sol.client?.razao_social || sol.client?.nome || "Não identificado";
    const calcType = sol.calculation_type?.name || "Não identificado";
    const isUrgent = sol.prioridade === "urgente";

    const systemPrompt = `Você é um assistente jurídico especializado em cálculos trabalhistas e processuais.
Você auxilia calculistas a entender e executar tarefas de cálculo.

CONTEXTO DA TAREFA ATUAL:
- Cliente: ${clientName}
- Tipo de Cálculo: ${calcType}
- Título: ${sol.titulo}
- Descrição/Motivo: ${sol.descricao || "Não informado"}
- Prioridade: ${sol.prioridade} ${isUrgent ? "(URGENTE)" : ""}
- Status: ${sol.status}
- Prazo: ${sol.data_limite || "Sem prazo"}
- Processo: ${sol.process ? `${sol.process.numero_processo} - ${sol.process.reclamante_nome}` : "Não vinculado"}
- Detalhes extraídos: ${sol.extracted_details ? JSON.stringify(sol.extracted_details) : "Nenhum"}
- Source: ${sol.source_type || sol.origem}

INSTRUÇÕES:
${isUrgent ? `- Esta tarefa é URGENTE. O campo indica possível rejeição pelo cliente. Sugira um checklist de revisão focado nos erros comuns de rejeição do cliente ${clientName}.` : ""}
- Responda de forma objetiva e prática.
- Se o usuário perguntar "O que fazer aqui?", analise o motivo/descrição e forneça um passo-a-passo claro.
- Se for cálculo de Acórdão, Sentença, Execução ou Inicial, explique brevemente as particularidades desse tipo.
- Use linguagem técnica mas acessível.
- Responda sempre em português brasileiro.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: user_message || "O que devo fazer nesta tarefa?" },
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ask-task-context error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
