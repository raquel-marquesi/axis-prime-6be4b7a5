import { useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, AlertCircle, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RowError {
  row: number;
  message: string;
}

interface ImportSummary {
  inserted: number;
  updated: number;
  errors: RowError[];
  total: number;
}

// Normaliza CNJ removendo espaços e caracteres não [0-9.\-]
function normalizeCnj(value: unknown): string {
  if (value == null) return "";
  return String(value).trim().replace(/[^0-9.\-]/g, "");
}

// Normaliza chave de header
function normalizeKey(k: string): string {
  return k.toString().trim().toLowerCase().replace(/\s+/g, "_");
}

// Converte para YYYY-MM-DD; aceita Date, ISO, dd/mm/yyyy, yyyy-mm-dd, número serial Excel
function parseDate(value: unknown): string {
  if (value == null || value === "") throw new Error("data_prazo vazia");

  if (value instanceof Date) {
    if (isNaN(value.getTime())) throw new Error("data_prazo inválida");
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof value === "number") {
    // Serial Excel
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) throw new Error("data_prazo inválida");
    const y = parsed.y;
    const m = String(parsed.m).padStart(2, "0");
    const d = String(parsed.d).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const s = String(value).trim();
  // ISO yyyy-mm-dd
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  // dd/mm/yyyy
  const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const d = brMatch[1].padStart(2, "0");
    const m = brMatch[2].padStart(2, "0");
    return `${brMatch[3]}-${m}-${d}`;
  }
  // Tentativa final via Date
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  throw new Error("data_prazo inválida");
}

function resolveAssigned(
  raw: unknown,
  emailMap: Map<string, string>,
  nameMap: Map<string, string>
): string | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.includes("@")) {
    return emailMap.get(s.toLowerCase()) ?? null;
  }
  return nameMap.get(s.toLowerCase()) ?? null;
}

async function readFileAsRows(file: File): Promise<Record<string, unknown>[]> {
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  let workbook: XLSX.WorkBook;
  if (isCsv) {
    const text = await file.text();
    workbook = XLSX.read(text, { type: "string" });
  } else {
    const buf = await file.arrayBuffer();
    workbook = XLSX.read(buf, { type: "array", cellDates: true });
  }
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Planilha vazia");
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });
  // Normaliza headers
  return raw.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      out[normalizeKey(k)] = v;
    }
    return out;
  });
}

export default function ImportarPautas() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSummary(null);
      setProgress(0);
      setProcessedCount(0);
      setTotalCount(0);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setSummary(null);
    setProgress(0);

    try {
      const rows = await readFileAsRows(file);
      if (rows.length === 0) {
        toast({ title: "Planilha vazia", description: "Nenhuma linha encontrada.", variant: "destructive" });
        setLoading(false);
        return;
      }

      setTotalCount(rows.length);

      // Pré-cargas em batch
      const uniqueCnjs = Array.from(
        new Set(rows.map((r) => normalizeCnj(r.numero_processo)).filter(Boolean))
      );
      const uniqueAssigned = Array.from(
        new Set(
          rows
            .map((r) => (r.assigned_to == null ? "" : String(r.assigned_to).trim()))
            .filter(Boolean)
        )
      );
      const uniqueEmails = uniqueAssigned.filter((s) => s.includes("@")).map((s) => s.toLowerCase());
      const uniqueNames = uniqueAssigned.filter((s) => !s.includes("@")).map((s) => s.toLowerCase());

      const processMap = new Map<string, string>();
      if (uniqueCnjs.length > 0) {
        // Chunk em lotes de 500 para evitar URL muito longa
        const chunkSize = 500;
        for (let i = 0; i < uniqueCnjs.length; i += chunkSize) {
          const chunk = uniqueCnjs.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from("processes")
            .select("id, numero_processo")
            .in("numero_processo", chunk);
          if (error) throw error;
          (data ?? []).forEach((p: any) => {
            if (p.numero_processo) processMap.set(normalizeCnj(p.numero_processo), p.id);
          });
        }
      }

      const emailMap = new Map<string, string>();
      const nameMap = new Map<string, string>();
      if (uniqueEmails.length > 0 || uniqueNames.length > 0) {
        const { data, error } = await supabase
          .from("profiles_safe" as any)
          .select("user_id, full_name, email");
        if (error) throw error;
        (data as any[] ?? []).forEach((p) => {
          if (p.email) emailMap.set(String(p.email).toLowerCase(), p.user_id);
          if (p.full_name) nameMap.set(String(p.full_name).toLowerCase(), p.user_id);
        });
      }

      let inserted = 0;
      let updated = 0;
      const errors: RowError[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +1 header, +1 base 1
        try {
          const numProc = row.numero_processo;
          const dataPrazoRaw = row.data_prazo;
          const ocorrencia = row.ocorrencia;

          if (!numProc) throw new Error("numero_processo vazio");
          if (!ocorrencia || String(ocorrencia).trim() === "") throw new Error("ocorrencia vazia");

          const cnj = normalizeCnj(numProc);
          const processId = processMap.get(cnj);
          if (!processId) throw new Error("processo não encontrado");

          const dataPrazo = parseDate(dataPrazoRaw);
          const assigned = resolveAssigned(row.assigned_to, emailMap, nameMap);

          const { data, error } = await supabase.rpc("core_create_deadline" as any, {
            payload: {
              process_id: processId,
              data_prazo: dataPrazo,
              ocorrencia: String(ocorrencia).trim(),
              detalhes: row.detalhes ? String(row.detalhes).trim() : null,
              assigned_to: assigned,
              source: "importacao_planilha",
            },
          });
          if (error) throw error;
          const r = data as { success: boolean; action?: string; error?: string };
          if (!r || r.success === false) throw new Error(r?.error ?? "rpc falhou");
          if (r.action === "inserted") inserted++;
          else updated++;
        } catch (e) {
          errors.push({ row: rowNum, message: (e as Error).message });
        }
        setProcessedCount(i + 1);
        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      setSummary({ inserted, updated, errors, total: rows.length });
      toast({
        title: "Importação concluída",
        description: `${inserted} inseridos, ${updated} atualizados, ${errors.length} erros.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: (error as Error).message || "Falha ao importar pautas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Importar Pautas</h1>
        <p className="text-sm text-muted-foreground">
          Faça o upload do arquivo de pautas para criar/atualizar prazos no sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Selecionar Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="pautas">Arquivo de Pautas (.xlsx, .csv)</Label>
            <Input
              id="pautas"
              type="file"
              onChange={handleFileChange}
              accept=".xlsx,.csv"
              disabled={loading}
            />
          </div>

          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              "Importar Dados"
            )}
          </Button>

          {file && !loading && !summary && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 p-3 bg-muted rounded-md">
              <FileText className="h-4 w-4" />
              <span>{file.name}</span>
            </div>
          )}

          {loading && totalCount > 0 && (
            <div className="space-y-2 mt-4">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-right">
                {progress}% ({processedCount}/{totalCount})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo da Importação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-md border bg-card">
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Inseridos</p>
                  <p className="text-2xl font-bold">{summary.inserted}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-md border bg-card">
                <RefreshCw className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Atualizados</p>
                  <p className="text-2xl font-bold">{summary.updated}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-md border bg-card">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-xs text-muted-foreground">Erros</p>
                  <p className="text-2xl font-bold">{summary.errors.length}</p>
                </div>
              </div>
            </div>

            {summary.errors.length > 0 && (
              <details className="border rounded-md" open={summary.errors.length <= 10}>
                <summary className="cursor-pointer p-3 text-sm font-medium hover:bg-muted">
                  Detalhes dos erros ({summary.errors.length})
                </summary>
                <ul className="divide-y max-h-80 overflow-y-auto">
                  {summary.errors.map((err, idx) => (
                    <li key={idx} className="px-3 py-2 text-sm flex gap-3">
                      <span className="font-mono text-muted-foreground shrink-0">
                        Linha {err.row}:
                      </span>
                      <span className="text-foreground">{err.message}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-md text-muted-foreground">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-foreground">Formato esperado</p>
          <p>
            Colunas: <code className="text-xs bg-muted px-1 py-0.5 rounded">numero_processo</code>,{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">data_prazo</code>,{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">ocorrencia</code>,{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">detalhes</code> (opc.),{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">assigned_to</code> (opc., email ou nome).
          </p>
          <p>Datas aceitas: dd/mm/yyyy, yyyy-mm-dd ou célula formatada como data.</p>
        </div>
      </div>
    </div>
  );
}
