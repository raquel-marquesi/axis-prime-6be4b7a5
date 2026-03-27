import { createClient } from "npm:@supabase/supabase-js@2";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mapeamento descritivo -> activity_type name (fallback quando tipo_atividade está vazio)
const DESCRIPTION_PATTERNS: [RegExp, string][] = [
  [/CONTESTACAO AOS CALCULOS DA PARTE ADVERSA/i, "Impugnação ao Cálculo"],
  [/ELABORACAO DE CALCULO DE SENTENCA/i, "Revisão Sentença"],
  [/APRESENTACAO DE CALCULO DE LIQUIDACAO/i, "Cálculo de Liquidação"],
  [/ELABORACAO DE CALCULO DE ACORDAO R[OR]/i, "Recurso Cálculo"],
  [/ELABORACAO DE CALCULO DE INICIAL/i, "Cálculo de Liquidação"],
  [/ELABORACAO DE EMBARGOS/i, "Embargos Declaração"],
  [/CONTESTACAO AOS CALCULOS DO PERITO/i, "Conferência de Cálculo"],
  [/ATUALIZACAO DOS VALORES PARA PAGAMENTO/i, "Atualização de Valores"],
  [/MANIFESTACAO A IMPUGNACAO/i, "Impugnação ao Cálculo"],
  [/MANIFESTACAO AOS CALCULOS DA CONTADORIA/i, "Conferência de Cálculo"],
  [/ELABORACAO DE CALCULO DE ACORDAO RR/i, "Recurso Cálculo"],
  [/AGRAVO DE PETICAO/i, "Agravo Instrumento"],
  [/PARECER/i, "Parecer Técnico"],
  [/DISCRIMINACAO DE VERBAS/i, "Cálculo de Liquidação"],
  [/RECALCULO DO VALOR HOMOLOGADO/i, "Homologação"],
  [/MANIFESTACAO AOS ESCLARECIMENTOS DO PERITO/i, "Conferência de Cálculo"],
  [/CALCULO DE HONORARIOS/i, "Cálculo de Honorários"],
  [/CALCULO FGTS/i, "Cálculo FGTS"],
  [/PROVISAO/i, "Provisão Trabalhista"],
  [/CONTINGENCIA/i, "Relatório Contingência"],
];

// Lightweight XLSX parser using JSZip + manual XML parsing
function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const regex = /<si>[\s\S]*?<\/si>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const si = match[0];
    const tRegex = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let tMatch;
    let text = "";
    while ((tMatch = tRegex.exec(si)) !== null) {
      text += tMatch[1];
    }
    text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    strings.push(text);
  }
  return strings;
}

function colLetterToIndex(col: string): number {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function parseSheet(xml: string, sharedStrings: string[]): any[] {
  const rows: any[] = [];
  let headers: string[] = [];
  
  const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;
  let rowIndex = 0;

  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rowContent = rowMatch[1];
    const cellRegex = /<c\s([^>]*)>[\s\S]*?<v>([\s\S]*?)<\/v>[\s\S]*?<\/c>/g;
    let cellMatch;
    const cells: Record<number, string> = {};

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cellMatch[1];
      const cellValue = cellMatch[2];
      
      const rMatch = attrs.match(/r="([A-Z]+)\d+"/);
      if (!rMatch) continue;
      const colIdx = colLetterToIndex(rMatch[1]);
      
      const tMatch = attrs.match(/t="([^"]*)"/);
      const cellType = tMatch ? tMatch[1] : "";

      let value: string;
      if (cellType === "s") {
        const ssIdx = parseInt(cellValue);
        value = sharedStrings[ssIdx] || "";
      } else {
        value = cellValue.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
      }
      cells[colIdx] = value;
    }

    if (rowIndex === 0) {
      const maxCol = Math.max(...Object.keys(cells).map(Number), 0);
      for (let i = 0; i <= maxCol; i++) {
        headers.push(cells[i] || `col_${i}`);
      }
    } else {
      const rowObj: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        rowObj[headers[i]] = cells[i] || "";
      }
      rows.push(rowObj);
    }
    rowIndex++;
  }

  return rows;
}

function parseDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "number" || /^\d+(\.\d+)?$/.test(String(val).trim())) {
    const num = parseFloat(String(val));
    if (num > 10000) {
      const d = new Date((num - 25569) * 86400 * 1000);
      return d.toISOString().split("T")[0];
    }
  }
  const str = String(val).trim();
  if (!str) return null;
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
  const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (usMatch) {
    const year = parseInt(usMatch[3]) + 2000;
    return `${year}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  return null;
}

function normalizeProcessNumber(num: string): string {
  return num.replace(/\s+/g, "").trim();
}

// Helper to get value from row with alternative header names
function getField(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return "";
}

// Caches
const userCache = new Map<string, string | null>();
const procCache = new Map<string, string | null>();

async function resolveUser(supabase: any, name: string): Promise<string | null> {
  const key = name.trim().toLowerCase();
  if (userCache.has(key)) return userCache.get(key)!;
  const { data } = await supabase.from("profiles").select("user_id")
    .ilike("full_name", name.trim()).eq("is_active", true).limit(1).single();
  let result = data?.user_id || null;
  if (!result) {
    const { data: p } = await supabase.from("profiles").select("user_id")
      .ilike("full_name", `%${name.trim()}%`).eq("is_active", true).limit(1).single();
    result = p?.user_id || null;
  }
  userCache.set(key, result);
  return result;
}

async function resolveProc(supabase: any, num: string): Promise<string | null> {
  const normalized = normalizeProcessNumber(num);
  if (procCache.has(normalized)) return procCache.get(normalized)!;
  
  // Try exact match first
  const { data } = await supabase.from("processes").select("id")
    .eq("numero_processo", normalized).limit(1).single();
  if (data?.id) {
    procCache.set(normalized, data.id);
    return data.id;
  }

  // Try with original (non-normalized) value
  const { data: d2 } = await supabase.from("processes").select("id")
    .eq("numero_processo", num.trim()).limit(1).single();
  if (d2?.id) {
    procCache.set(normalized, d2.id);
    return d2.id;
  }

  // Try by codigo_externo
  const { data: d3 } = await supabase.from("processes").select("id")
    .eq("codigo_externo", normalized).limit(1).single();
  if (d3?.id) {
    procCache.set(normalized, d3.id);
    return d3.id;
  }

  procCache.set(normalized, null);
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { storage_path, bucket = "bank-statements", offset = 0, limit = 300 } = body;

    if (!storage_path) {
      return new Response(JSON.stringify({ error: "storage_path required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Downloading ${bucket}/${storage_path}...`);
    const { data: fileData, error: dlErr } = await supabase.storage.from(bucket).download(storage_path);
    if (dlErr || !fileData) throw new Error(`Download failed: ${dlErr?.message}`);

    const buf = await fileData.arrayBuffer();
    console.log(`Downloaded ${buf.byteLength} bytes, parsing ZIP...`);

    const zip = await JSZip.loadAsync(buf);

    const ssFile = zip.file("xl/sharedStrings.xml");
    const ssXml = ssFile ? await ssFile.async("string") : "";
    const sharedStrings = parseSharedStrings(ssXml);
    console.log(`Parsed ${sharedStrings.length} shared strings`);

    const sheetFile = zip.file("xl/worksheets/sheet1.xml");
    if (!sheetFile) throw new Error("sheet1.xml not found");
    const sheetXml = await sheetFile.async("string");
    const allRows = parseSheet(sheetXml, sharedStrings);
    const totalRows = allRows.length;
    console.log(`Total data rows: ${totalRows}, processing offset=${offset} limit=${limit}`);
    if (totalRows > 0) {
      const sample = allRows[0];
      console.log(`Headers/keys: ${Object.keys(sample).join(", ")}`);
      console.log(`Sample row 0: ${JSON.stringify(sample).substring(0, 500)}`);
    }

    const rows = allRows.slice(offset, offset + limit);

    // Load activity types for matching
    const { data: actTypes } = await supabase
      .from("activity_types")
      .select("id, name")
      .eq("is_active", true);
    
    const actNameToId = new Map<string, string>();
    const actNameLowerToId = new Map<string, string>();
    actTypes?.forEach((at: any) => {
      actNameToId.set(at.name, at.id);
      actNameLowerToId.set(at.name.toLowerCase(), at.id);
    });

    // Resolve activity type: try direct match, then fuzzy, then description pattern
    function resolveActivityType(tipoAtiv: string, descritivo: string): string | null {
      // 1. Direct match by name
      if (tipoAtiv) {
        const direct = actNameToId.get(tipoAtiv) || actNameLowerToId.get(tipoAtiv.toLowerCase());
        if (direct) return direct;

        // Fuzzy: check if any activity_type name contains the tipoAtiv
        for (const [name, id] of actNameToId) {
          if (name.toLowerCase().includes(tipoAtiv.toLowerCase()) || 
              tipoAtiv.toLowerCase().includes(name.toLowerCase())) {
            return id;
          }
        }
      }

      // 2. Infer from descritivo using pattern matching
      if (descritivo) {
        const descUpper = descritivo.toUpperCase();
        for (const [pattern, actName] of DESCRIPTION_PATTERNS) {
          if (pattern.test(descUpper)) {
            return actNameToId.get(actName) || null;
          }
        }
      }

      return null;
    }

    // Load deadlines for reconciliation (only on first batch)
    let openDeadlines: any[] = [];
    if (offset === 0) {
      const { data: dl } = await supabase
        .from("process_deadlines")
        .select("id, process_id, data_prazo, ocorrencia, processes!inner(numero_processo)")
        .eq("is_completed", false).limit(5000);
      openDeadlines = (dl || []).map((d: any) => ({
        id: d.id, process_id: d.process_id,
        numero_processo: d.processes?.numero_processo || "",
        data_prazo: d.data_prazo, reconciled: false,
      }));
      console.log(`Loaded ${openDeadlines.length} open deadlines`);
    }

    let created = 0, reconciled = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = offset + i + 1;
      try {
        const profissional = getField(row, "profissional", "Profissional").trim();
        const dataAtiv = parseDate(getField(row, "data", "Data", "data_lancamento"));
        const descricao = getField(row, "descritivo", "Descritivo", "descricao").trim();
        const numProc = getField(row, "numero_processo", "Numero_Processo").trim();
        const tipoAtiv = getField(row, "tipo_atividade", "Tipo_Atividade", "tipo_calculo", "Tipo", "atividade", "Atividade").trim();
        const parteContr = getField(row, "parte_contraria", "Parte_Contraria").trim();
        const codExt = getField(row, "codigo_externo", "Codigo_Externo").trim();
        const pesoStr = getField(row, "Peso", "peso").trim();

        if (!dataAtiv) { errors.push(`#${rowNum}: data invalida`); continue; }
        if (!descricao) { errors.push(`#${rowNum}: descritivo vazio`); continue; }

        const userId = profissional ? await resolveUser(supabase, profissional) : null;
        if (!userId) { errors.push(`#${rowNum}: "${profissional}" nao encontrado`); continue; }

        const processId = (numProc && numProc.length >= 5) ? await resolveProc(supabase, numProc) : null;
        const actTypeId = resolveActivityType(tipoAtiv, descricao);

        // Use Peso field as quantidade when available
        const quantidade = pesoStr ? (parseFloat(pesoStr) || 1) : 1;

        if (processId && codExt) {
          await supabase.from("processes").update({ codigo_externo: codExt }).eq("id", processId);
        }

        const { error: insErr } = await supabase.from("timesheet_entries").insert({
          user_id: userId, process_id: processId, activity_type_id: actTypeId,
          data_atividade: dataAtiv, descricao, quantidade: Math.round(quantidade), 
          reclamante_nome: parteContr || null,
        });

        if (insErr) { errors.push(`#${rowNum}: ${insErr.message}`); continue; }
        created++;

        if (processId && openDeadlines.length > 0) {
          const normalizedNum = normalizeProcessNumber(numProc);
          const match = openDeadlines.find((d: any) => 
            normalizeProcessNumber(d.numero_processo) === normalizedNum && !d.reconciled
          );
          if (match) {
            const { error: updErr } = await supabase.from("process_deadlines")
              .update({ is_completed: true, completed_at: dataAtiv, completed_by: userId })
              .eq("id", match.id);
            if (!updErr) { match.reconciled = true; reconciled++; }
          }
        }

        if ((i + 1) % 50 === 0) console.log(`Progress: ${i + 1}/${rows.length}`);
      } catch (e: any) {
        errors.push(`#${rowNum}: ${e.message}`);
      }
    }

    console.log(`Batch done: ${created} created, ${reconciled} reconciled, ${errors.length} errors`);

    return new Response(JSON.stringify({
      status: "ok", total_rows: totalRows,
      processed_range: `${offset}-${offset + rows.length}`,
      created_entries: created, reconciled_deadlines: reconciled,
      errors_count: errors.length, errors: errors.slice(0, 50),
      has_more: offset + limit < totalRows,
      next_offset: offset + limit,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("xlsx-direct-import error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
