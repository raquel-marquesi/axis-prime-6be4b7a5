import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractionResult {
  calculation_type: string | null;
  client_name: string | null;
  deadline: string | null;
  cnj_number: string | null;
  urgency: "baixa" | "media" | "alta" | "urgente";
  confidence: number;
  summary: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { raw_text, email_subject, email_from } = await req.json();

    if (!raw_text && !email_subject) {
      return new Response(
        JSON.stringify({ error: "raw_text or email_subject is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch calculation types for matching
    const { data: calcTypes } = await supabase
      .from("calculation_types")
      .select("id, name, estimated_complexity")
      .eq("is_active", true);

    // Fetch client names for matching
    const { data: clients } = await supabase
      .from("clients")
      .select("id, nome_fantasia, razao_social, cnpj, cpf")
      .eq("is_active", true);

    const calcTypeNames = (calcTypes || []).map((ct) => ct.name).join(", ");
    const clientNames = (clients || [])
      .map((c) => c.nome_fantasia || c.razao_social || "")
      .filter(Boolean)
      .slice(0, 100) // limit to avoid token overflow
      .join(", ");

    const inputText = [
      email_subject ? `Assunto: ${email_subject}` : "",
      email_from ? `De: ${email_from}` : "",
      raw_text ? `Conteúdo:\n${raw_text.substring(0, 4000)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um assistente de classificação de e-mails para um escritório de advocacia trabalhista.
Analise o texto a seguir e extraia as informações estruturadas.

TIPOS DE CÁLCULO DISPONÍVEIS: ${calcTypeNames || "Nenhum cadastrado"}

CLIENTES CADASTRADOS (parcial): ${clientNames || "Nenhum cadastrado"}

Responda SOMENTE com os dados extraídos usando a ferramenta fornecida.
Se não encontrar uma informação, use null.
Para urgência, considere: palavras como "urgente", "prazo fatal", "amanhã" = urgente; "importante", "prioridade" = alta; sem indicação = media; "sem pressa", "quando possível" = baixa.
Para confiança, dê um valor entre 0 e 1 indicando quão seguro você está da extração geral.
Para o campo calculation_type, use EXATAMENTE um dos nomes listados acima, ou null se nenhum corresponder.
Para client_name, use EXATAMENTE um dos nomes listados acima se encontrar correspondência, ou o nome mencionado no texto.
Para deadline, extraia datas no formato YYYY-MM-DD se mencionadas.
Para cnj_number, extraia números no formato CNJ (0000000-00.0000.0.00.0000).`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: inputText },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_data",
                description:
                  "Extrai dados estruturados de um e-mail ou texto jurídico",
                parameters: {
                  type: "object",
                  properties: {
                    calculation_type: {
                      type: "string",
                      description:
                        "Tipo de cálculo exato da lista fornecida, ou null",
                      nullable: true,
                    },
                    client_name: {
                      type: "string",
                      description:
                        "Nome do cliente exato da lista fornecida, ou nome mencionado no texto",
                      nullable: true,
                    },
                    deadline: {
                      type: "string",
                      description: "Data limite no formato YYYY-MM-DD, ou null",
                      nullable: true,
                    },
                    cnj_number: {
                      type: "string",
                      description:
                        "Número do processo CNJ no formato 0000000-00.0000.0.00.0000, ou null",
                      nullable: true,
                    },
                    urgency: {
                      type: "string",
                      enum: ["baixa", "media", "alta", "urgente"],
                      description: "Nível de urgência detectado",
                    },
                    confidence: {
                      type: "number",
                      description:
                        "Confiança geral da extração, entre 0.0 e 1.0",
                    },
                    summary: {
                      type: "string",
                      description:
                        "Resumo breve (1-2 frases) do que o e-mail solicita",
                    },
                  },
                  required: [
                    "calculation_type",
                    "client_name",
                    "deadline",
                    "cnj_number",
                    "urgency",
                    "confidence",
                    "summary",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_data" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", status, errText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway returned ${status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Parse tool call result
    let extraction: ExtractionResult = {
      calculation_type: null,
      client_name: null,
      deadline: null,
      cnj_number: null,
      urgency: "media",
      confidence: 0,
      summary: "",
    };

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args =
          typeof toolCall.function.arguments === "string"
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;
        extraction = { ...extraction, ...args };
      } catch (parseError) {
        console.error("Error parsing tool call arguments:", parseError);
      }
    }

    // Match calculation_type to ID
    let calculation_type_id: string | null = null;
    let estimated_complexity = 1;
    if (extraction.calculation_type && calcTypes) {
      const match = calcTypes.find(
        (ct) =>
          ct.name.toLowerCase() === extraction.calculation_type!.toLowerCase()
      );
      if (match) {
        calculation_type_id = match.id;
        estimated_complexity = match.estimated_complexity;
      }
    }

    // Match client_name to ID
    let client_id: string | null = null;
    if (extraction.client_name && clients) {
      const nameToMatch = extraction.client_name.toLowerCase();
      const match = clients.find(
        (c) =>
          (c.nome_fantasia || "").toLowerCase().includes(nameToMatch) ||
          nameToMatch.includes((c.nome_fantasia || "").toLowerCase()) ||
          (c.razao_social || "").toLowerCase().includes(nameToMatch) ||
          nameToMatch.includes((c.razao_social || "").toLowerCase())
      );
      if (match) {
        client_id = match.id;
      }
    }

    const result = {
      extraction,
      calculation_type_id,
      estimated_complexity,
      client_id,
      extracted_details: extraction,
      ai_confidence: Math.min(1, Math.max(0, extraction.confidence || 0)),
    };

    console.log("Extraction result:", JSON.stringify({
      calculation_type: extraction.calculation_type,
      client_name: extraction.client_name,
      confidence: extraction.confidence,
      calculation_type_id,
      client_id,
    }));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("extract-calculation-data error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
