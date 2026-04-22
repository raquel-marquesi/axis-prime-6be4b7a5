import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Normalize accented chars for matching
function removeAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Mapeamento descritivo -> activity_type name
const DESCRIPTION_PATTERNS: [string, string][] = [
  ["CONTESTACAO AOS CALCULOS DA PARTE ADVERSA", "Impugnação ao Cálculo"],
  ["CONTESTACAO AOS CALCULOS DO PERITO", "Conferência de Cálculo"],
  ["CONTESTACAO AOS CALCULOS DA CONTADORIA", "Conferência de Cálculo"],
  ["ELABORACAO DE CALCULO DE SENTENCA", "Revisão Sentença"],
  ["APRESENTACAO DE CALCULO DE LIQUIDACAO", "Cálculo de Liquidação"],
  ["APRESENTACAO DE CALCULO READEQUADO", "Cálculo de Liquidação"],
  ["ELABORACAO DE CALCULO DE ACORDAO", "Recurso Cálculo"],
  ["ELABORACAO DE CALCULO DE INICIAL", "Cálculo de Liquidação"],
  ["ELABORACAO DE CALCULO DE E-SOCIAL", "Cálculo de Liquidação"],
  ["ELABORACAO DE EMBARGOS", "Embargos Declaração"],
  ["ATUALIZACAO DOS VALORES PARA PAGAMENTO", "Atualização de Valores"],
  ["MANIFESTACAO A IMPUGNACAO", "Impugnação ao Cálculo"],
  ["MANIFESTACAO AOS CALCULOS DA CONTADORIA", "Conferência de Cálculo"],
  ["MANIFESTACAO AOS ESCLARECIMENTOS DO PERITO", "Conferência de Cálculo"],
  ["MANIFESTACAO PARA AGRAVO DE PETICAO", "Agravo Instrumento"],
  ["AGRAVO DE PETICAO", "Agravo Instrumento"],
  ["DISCRIMINACAO DE VERBAS", "Cálculo de Liquidação"],
  ["RECALCULO DO VALOR HOMOLOGADO", "Homologação"],
  ["IMPUGNACAO", "Impugnação ao Cálculo"],
  ["IMPUNGACAO", "Impugnação ao Cálculo"],
  ["LAUDO DE DIFERENCA", "Cálculo de Liquidação"],
  ["SENTENCA", "Revisão Sentença"],
  ["ACORDAO", "Recurso Cálculo"],
  ["PARECER", "Parecer Técnico"],
  ["DIGITACAO", "Importação Dados"],
  ["CALCULO DE HONORARIOS", "Cálculo de Honorários"],
  ["CALCULO FGTS", "Cálculo FGTS"],
  ["PROVISAO", "Provisão Trabalhista"],
  ["CONTINGENCIA", "Relatório Contingência"],
];

function normalizeProcessNumber(num: string): string {
  return num.replace(/\s+/g, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batch_size || 500;
    const etapa = body.etapa || "all"; // "activity", "process", "all"

    const stats = {
      activity_linked: 0,
      activity_already_set: 0,
      activity_no_match: 0,
      process_linked: 0,
      process_already_set: 0,
      process_no_match: 0,
      process_created: 0,
      total_processed: 0,
      errors: [] as string[],
    };

    // ========== ETAPA A: Vincular activity_type_id ==========
    if (etapa === "activity" || etapa === "all") {
      console.log("=== Etapa A: Vinculando activity_type_id ===");

      // Load all activity types
      const { data: actTypes } = await supabase
        .from("activity_types")
        .select("id, name")
        .eq("is_active", true);
      
      const actNameToId = new Map<string, string>();
      actTypes?.forEach((at: any) => actNameToId.set(at.name, at.id));

      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: entries, error } = await supabase
          .from("timesheet_entries")
          .select("id, descricao")
          .is("activity_type_id", null)
          .range(offset, offset + batchSize - 1)
          .order("id");

        if (error) { stats.errors.push(`Fetch err: ${error.message}`); break; }
        if (!entries || entries.length === 0) { hasMore = false; break; }

        const updates: { id: string; activity_type_id: string }[] = [];

        for (const entry of entries) {
          const desc = removeAccents((entry.descricao || "").toUpperCase());
          let matchedId: string | null = null;

          for (const [pattern, actName] of DESCRIPTION_PATTERNS) {
            if (desc.includes(pattern)) {
              matchedId = actNameToId.get(actName) || null;
              break;
            }
          }

          if (matchedId) {
            updates.push({ id: entry.id, activity_type_id: matchedId });
            stats.activity_linked++;
          } else {
            stats.activity_no_match++;
          }
        }

        // Batch update using individual updates (Supabase doesn't support batch upsert on subset of columns easily)
        if (updates.length > 0) {
          // Use a raw approach: update each in small batches
          for (let i = 0; i < updates.length; i += 50) {
            const batch = updates.slice(i, i + 50);
            const ids = batch.map(u => u.id);
            // Group by activity_type_id for efficient updates
            const byType = new Map<string, string[]>();
            for (const u of batch) {
              const arr = byType.get(u.activity_type_id) || [];
              arr.push(u.id);
              byType.set(u.activity_type_id, arr);
            }
            for (const [typeId, entryIds] of byType) {
              const { error: upErr } = await supabase
                .from("timesheet_entries")
                .update({ activity_type_id: typeId })
                .in("id", entryIds);
              if (upErr) stats.errors.push(`Update err: ${upErr.message}`);
            }
          }
        }

        stats.total_processed += entries.length;
        console.log(`Activity batch: processed ${entries.length}, linked ${updates.length}, offset ${offset}`);
        
        if (entries.length < batchSize) hasMore = false;
        else offset += batchSize;
      }
    }

    // ========== ETAPA B: Vincular process_id ==========
    if (etapa === "process" || etapa === "all") {
      console.log("=== Etapa B: Vinculando process_id ===");

      // Load all processes with normalized numbers
      const { data: allProcesses } = await supabase
        .from("processes")
        .select("id, numero_processo, codigo_externo, id_cliente")
        .limit(10000);

      const procByNum = new Map<string, string>();
      const procByExt = new Map<string, string>();
      allProcesses?.forEach((p: any) => {
        const normalized = normalizeProcessNumber(p.numero_processo);
        procByNum.set(normalized, p.id);
        if (p.codigo_externo) {
          procByExt.set(normalizeProcessNumber(p.codigo_externo), p.id);
        }
      });

      console.log(`Loaded ${procByNum.size} processes, ${procByExt.size} with codigo_externo`);

      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        // Fetch entries without process_id that have a descricao containing a process number pattern
        const { data: entries, error } = await supabase
          .from("timesheet_entries")
          .select("id, descricao, reclamante_nome")
          .is("process_id", null)
          .range(offset, offset + batchSize - 1)
          .order("id");

        if (error) { stats.errors.push(`Fetch proc err: ${error.message}`); break; }
        if (!entries || entries.length === 0) { hasMore = false; break; }

        // Try to extract process number from descricao
        // Common pattern: "PROCESSO: 0001234-56.2020.5.01.0001" or just the number in the description
        const procNumRegex = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/;

        const updates: { id: string; process_id: string }[] = [];

        for (const entry of entries) {
          const desc = entry.descricao || "";
          const match = desc.match(procNumRegex);
          if (match) {
            const normalized = normalizeProcessNumber(match[1]);
            const procId = procByNum.get(normalized) || procByExt.get(normalized);
            if (procId) {
              updates.push({ id: entry.id, process_id: procId });
              stats.process_linked++;
            } else {
              stats.process_no_match++;
            }
          } else {
            stats.process_no_match++;
          }
        }

        if (updates.length > 0) {
          for (let i = 0; i < updates.length; i += 50) {
            const batch = updates.slice(i, i + 50);
            const byProc = new Map<string, string[]>();
            for (const u of batch) {
              const arr = byProc.get(u.process_id) || [];
              arr.push(u.id);
              byProc.set(u.process_id, arr);
            }
            for (const [procId, entryIds] of byProc) {
              const { error: upErr } = await supabase
                .from("timesheet_entries")
                .update({ process_id: procId })
                .in("id", entryIds);
              if (upErr) stats.errors.push(`Update proc err: ${upErr.message}`);
            }
          }
        }

        stats.total_processed += entries.length;
        console.log(`Process batch: processed ${entries.length}, linked ${updates.length}, offset ${offset}`);
        
        if (entries.length < batchSize) hasMore = false;
        else offset += batchSize;
      }
    }

    console.log("=== Backfill complete ===", JSON.stringify(stats));

    return new Response(JSON.stringify({
      status: "ok",
      stats,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("backfill-timesheet error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
