import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getDeadlinesContext(supabase: any, userId: string) {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 7) + "-01";
  const nextMonth = new Date(new Date(monthStart).getTime() + 32 * 86400000);
  const monthEnd = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 0).toISOString().split("T")[0];

  // Overdue deadlines
  const { data: overdue } = await supabase
    .from("process_deadlines")
    .select("id, data_prazo, ocorrencia, process:processes!process_id(numero_processo, reclamante_nome)")
    .eq("is_completed", false)
    .lt("data_prazo", today)
    .or(`assigned_to.eq.${userId}`)
    .order("data_prazo", { ascending: true })
    .limit(20);

  // Today's deadlines
  const { data: todayDeadlines } = await supabase
    .from("process_deadlines")
    .select("id, data_prazo, ocorrencia, process:processes!process_id(numero_processo, reclamante_nome)")
    .eq("is_completed", false)
    .eq("data_prazo", today)
    .or(`assigned_to.eq.${userId}`)
    .limit(20);

  // Month summary
  const { data: monthAll } = await supabase
    .from("process_deadlines")
    .select("id, data_prazo, is_completed, assigned_to")
    .gte("data_prazo", monthStart)
    .lte("data_prazo", monthEnd);

  const total = monthAll?.length || 0;
  const completed = monthAll?.filter((d: any) => d.is_completed)?.length || 0;
  const overdueCount = overdue?.length || 0;

  // Last sync status
  const { data: syncLogs } = await supabase
    .from("sync_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(5);

  const lastDeadlineSync = syncLogs?.find((l: any) =>
    l.sheet_type === "external_agendamentos" || l.sheet_type === "atividades"
  );

  // Team deadlines (for coordinators)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, area")
    .eq("user_id", userId)
    .single();

  let teamInfo = "";
  if (profile) {
    const { data: teamMembers } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("reports_to", profile.id)
      .eq("is_active", true);

    if (teamMembers && teamMembers.length > 0) {
      const teamIds = teamMembers.map((m: any) => m.user_id);
      const { data: teamOverdue } = await supabase
        .from("process_deadlines")
        .select("assigned_to, data_prazo")
        .eq("is_completed", false)
        .lt("data_prazo", today)
        .in("assigned_to", teamIds);

      const byMember: Record<string, number> = {};
      teamOverdue?.forEach((d: any) => {
        const name = teamMembers.find((m: any) => m.user_id === d.assigned_to)?.full_name || "Desconhecido";
        byMember[name] = (byMember[name] || 0) + 1;
      });

      if (Object.keys(byMember).length > 0) {
        teamInfo = `\n\nATRASOS POR MEMBRO DA EQUIPE:\n${Object.entries(byMember).map(([n, c]) => `- ${n}: ${c} atrasos`).join("\n")}`;
      } else {
        teamInfo = "\n\nEquipe sem atrasos no momento.";
      }
    }
  }

  return `DADOS DE PRAZOS PROCESSUAIS (dados reais do sistema):

RESUMO DO MÊS (${monthStart.slice(0, 7)}):
- Total de prazos: ${total}
- Concluídos: ${completed}
- Taxa de cumprimento: ${total > 0 ? ((completed / total) * 100).toFixed(1) : 0}%

PRAZOS ATRASADOS (${overdueCount}):
${overdue?.map((d: any) => `- ${d.process?.numero_processo || "?"} | ${d.ocorrencia || "Sem ocorrência"} | Venceu em ${d.data_prazo}`).join("\n") || "Nenhum prazo atrasado."}

PRAZOS DE HOJE (${todayDeadlines?.length || 0}):
${todayDeadlines?.map((d: any) => `- ${d.process?.numero_processo || "?"} | ${d.ocorrencia || "Sem ocorrência"}`).join("\n") || "Nenhum prazo para hoje."}

ÚLTIMA SINCRONIZAÇÃO:
${lastDeadlineSync ? `- Tipo: ${lastDeadlineSync.sheet_type}\n- Status: ${lastDeadlineSync.status}\n- Início: ${lastDeadlineSync.started_at}\n- Linhas processadas: ${lastDeadlineSync.rows_processed}/${lastDeadlineSync.rows_found}\n- Falhas: ${lastDeadlineSync.rows_failed}\n- Erros: ${lastDeadlineSync.error_message || "Nenhum"}${lastDeadlineSync.details?.errors?.length ? "\n- Detalhes: " + lastDeadlineSync.details.errors.slice(0, 5).join("; ") : ""}` : "Nenhuma sincronização encontrada."}
${teamInfo}`;
}

async function getSolicitacoesContext(supabase: any, userId: string, solicitacaoId?: string) {
  if (solicitacaoId) {
    const { data: sol } = await supabase
      .from("solicitacoes")
      .select(`*, client:clients!client_id(nome, razao_social), process:processes!process_id(numero_processo, numero_pasta, reclamante_nome, reclamadas, area), calculation_type:calculation_types!calculation_type_id(name, estimated_complexity)`)
      .eq("id", solicitacaoId)
      .single();

    if (sol) {
      const clientName = sol.client?.razao_social || sol.client?.nome || "Não identificado";
      return `CONTEXTO DA SOLICITAÇÃO:
- Título: ${sol.titulo}
- Cliente: ${clientName}
- Tipo de Cálculo: ${sol.calculation_type?.name || "Não identificado"}
- Descrição: ${sol.descricao || "Não informada"}
- Prioridade: ${sol.prioridade}${sol.prioridade === "urgente" ? " (URGENTE)" : ""}
- Status: ${sol.status}
- Prazo: ${sol.data_limite || "Sem prazo"}
- Processo: ${sol.process ? `${sol.process.numero_processo} - ${sol.process.reclamante_nome}` : "Não vinculado"}
- Detalhes extraídos: ${sol.extracted_details ? JSON.stringify(sol.extracted_details) : "Nenhum"}`;
    }
  }

  // General pending tasks
  const { data: pending } = await supabase
    .from("solicitacoes")
    .select("id, titulo, prioridade, status, data_limite, client:clients!client_id(razao_social)")
    .in("status", ["pendente", "em_andamento"])
    .eq("assigned_to", userId)
    .order("created_at", { ascending: false })
    .limit(15);

  const urgentes = pending?.filter((s: any) => s.prioridade === "urgente") || [];
  const altas = pending?.filter((s: any) => s.prioridade === "alta") || [];

  return `SOLICITAÇÕES PENDENTES DO USUÁRIO:
- Total pendentes: ${pending?.length || 0}
- Urgentes: ${urgentes.length}
- Alta prioridade: ${altas.length}

LISTA:
${pending?.map((s: any) => `- [${s.prioridade.toUpperCase()}] ${s.titulo} | Cliente: ${s.client?.razao_social || "?"} | Prazo: ${s.data_limite || "Sem prazo"}`).join("\n") || "Nenhuma solicitação pendente."}`;
}

async function getGeralContext(supabase: any, userId: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data: overdue } = await supabase
    .from("process_deadlines")
    .select("id")
    .eq("is_completed", false)
    .lt("data_prazo", today)
    .eq("assigned_to", userId);

  const { data: pendingSol } = await supabase
    .from("solicitacoes")
    .select("id, prioridade")
    .in("status", ["pendente", "em_andamento"])
    .eq("assigned_to", userId);

  const urgentes = pendingSol?.filter((s: any) => s.prioridade === "urgente")?.length || 0;

  return `VISÃO GERAL DO USUÁRIO:
- Prazos atrasados: ${overdue?.length || 0}
- Solicitações pendentes: ${pendingSol?.length || 0}
- Solicitações urgentes: ${urgentes}

${(overdue?.length || 0) > 0 ? "⚠️ Existem prazos atrasados que precisam de atenção imediata." : "✅ Sem prazos atrasados."}
${urgentes > 0 ? "🔴 Existem solicitações URGENTES pendentes." : ""}`;
}

const MODULE_SYSTEM_PROMPTS: Record<string, string> = {
  prazos: `Você é um assistente especializado em gestão de prazos processuais de um escritório de cálculos trabalhistas.
Você tem acesso aos dados reais do sistema e pode informar sobre:
- Prazos atrasados, do dia e futuros
- Status das sincronizações de agenda
- Atribuições de prazos a membros da equipe
- Taxa de cumprimento mensal
Responda de forma objetiva, prática e em português brasileiro. Use formatação markdown quando útil.`,

  solicitacoes: `Você é um assistente jurídico especializado em cálculos trabalhistas e processuais.
Você auxilia calculistas a entender e executar tarefas de cálculo.
Responda de forma objetiva e prática. Se o usuário perguntar "O que fazer aqui?", analise o contexto e forneça um passo-a-passo claro.
Use linguagem técnica mas acessível. Responda sempre em português brasileiro. Use formatação markdown.`,

  geral: `Você é um assistente inteligente de um sistema de gestão de escritório de cálculos trabalhistas.
Ajude o usuário com uma visão geral do seu dia, prioridades e pendências.
Responda de forma objetiva e em português brasileiro. Use formatação markdown.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { module, user_message, context } = await req.json();

    if (!module || !user_message) {
      return new Response(JSON.stringify({ error: "module e user_message são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Use service role for data queries
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get module-specific context
    let dataContext = "";
    switch (module) {
      case "prazos":
        dataContext = await getDeadlinesContext(supabase, userId);
        break;
      case "solicitacoes":
        dataContext = await getSolicitacoesContext(supabase, userId, context?.solicitacao_id);
        break;
      case "geral":
        dataContext = await getGeralContext(supabase, userId);
        break;
      default:
        dataContext = await getGeralContext(supabase, userId);
    }

    const systemPrompt = `${MODULE_SYSTEM_PROMPTS[module] || MODULE_SYSTEM_PROMPTS.geral}\n\n${dataContext}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: user_message },
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
    console.error("ai-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
