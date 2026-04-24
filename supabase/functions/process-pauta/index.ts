import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { parse } from "https://esm.sh/papaparse@5.4.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function detectDelimiter(csv: string): string {
  const firstLine = csv.split('\n')[0] || '';
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

function mapRowToRecord(row: Record<string, any>, cliente: string) {
  const numProcesso = row['numero_processo'] || row['(Processo) Número'] || row['Processo'] || '';
  const idTarefa = row['id_tarefa'] || row['ID da Tarefa'] || row['ID da Tarefa '] || row['ID Externo'] || '';
  const dataRef = row['data_registro'] || row['Data Registrado'] || row['Data da Decisão'] || row['Data'] || '';
  const subtipo = row['subtipo'] || row['Subtipo'] || row['Sub Tipo'] || '';
  const parteContraria = row['parte_contraria'] || row['(Processo) Parte Contrária'] || row['Parte Contrária'] || '';
  const observacao = row['observacao'] || row['Observação da Solicitação dos Cálculos'] || row['Observação'] || '';
  const motivo = row['motivo_calculo'] || row['Motivo da Solicitação de Cálculos'] || '';
  const tipoDecisao = row['tipo_decisao'] || row['Tipo de Decisão - Trabalhista'] || '';
  const resultadoDecisao = row['resultado_decisao'] || row['Resultado da Decisão'] || '';

  const numeroProcessoClean = String(numProcesso).trim();
  if (!numeroProcessoClean) return null;

  return {
    cliente_marquesi: cliente,
    numero_processo: numeroProcessoClean,
    parte_contraria: String(parteContraria).trim() || null,
    id_tarefa_cliente: String(idTarefa).trim() || null,
    data_registro_cliente: String(dataRef).trim() || null,
    tipo_servico: String(subtipo).trim() || null,
    observacao_calculo: String(observacao).trim() || null,
    motivo_calculo: String(motivo).trim() || null,
    tipo_decisao: String(tipoDecisao).trim() || null,
    resultado_decisao: String(resultadoDecisao).trim() || null,
    status_processamento: 'Pendente',
    json_original: row,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Auth: accept X-API-Key, Authorization bearer, or Supabase apikey
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    const expectedKey = Deno.env.get('EXTERNAL_API_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const isAuthorized = apiKey === expectedKey
      || apiKey === serviceRoleKey
      || apiKey === supabaseAnonKey;

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const body = await req.json();
    const { cliente, rows, csvContent } = body;

    if (!cliente) {
      throw new Error('Campo "cliente" é obrigatório.');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Processando pauta para: ${cliente}`);

    let records: any[] = [];

    if (Array.isArray(rows) && rows.length > 0) {
      // Direct JSON array from GAS
      records = rows.map((row: any) => mapRowToRecord(row, cliente)).filter(Boolean);
    } else if (csvContent) {
      // CSV fallback (from frontend or GAS)
      let cleanedContent = csvContent;

      // Auto-detect if first lines are junk (no delimiter in first line = junk header)
      const lines = csvContent.split('\n');
      const delimiter = detectDelimiter(csvContent);
      const firstLineDelimiters = (lines[0].match(delimiter === ';' ? /;/g : /,/g) || []).length;
      if (firstLineDelimiters < 2 && lines.length > 4) {
        // Likely has junk header lines, try skipping up to 3
        for (let skip = 1; skip <= 3; skip++) {
          const candidateLine = lines[skip];
          const count = (candidateLine.match(delimiter === ';' ? /;/g : /,/g) || []).length;
          if (count >= 2) {
            cleanedContent = lines.slice(skip).join('\n');
            break;
          }
        }
      }

      const detectedDelimiter = detectDelimiter(cleanedContent);
      const { data, errors } = parse(cleanedContent, {
        header: true,
        skipEmptyLines: true,
        delimiter: detectedDelimiter,
        transformHeader: (h: string) => h.trim(),
      });

      if (errors.length > 0 && data.length === 0) {
        console.error("Erro no Parse do CSV:", errors);
        throw new Error("Não foi possível processar o formato do CSV.");
      }

      records = data.map((row: any) => mapRowToRecord(row, cliente)).filter(Boolean);
    } else {
      throw new Error('Envie "rows" (JSON array) ou "csvContent" (string CSV).');
    }

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum registro válido encontrado.', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Upsert using the composite partial unique index
    const { error: insertError } = await supabase
      .from('pautas_unificadas')
      .upsert(records, { onConflict: 'cliente_marquesi,id_tarefa_cliente', ignoreDuplicates: false });

    if (insertError) throw insertError;

    console.log(`${records.length} registros processados para ${cliente}`);

    return new Response(
      JSON.stringify({
        message: `Sucesso! ${records.length} registros processados.`,
        count: records.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro na Edge Function:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
})
