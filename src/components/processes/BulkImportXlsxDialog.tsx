import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, FolderOpen, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ExcelJS from 'exceljs';

interface BulkImportXlsxDialogProps { open: boolean; onOpenChange: (open: boolean) => void; }
type ImportPhase = 'upload' | 'preview' | 'importing' | 'done';
type FileType = 'agendamentos' | 'timesheet' | 'timesheet-reconcile' | 'processos';
interface ParsedFile { name: string; type: FileType; rows: Record<string, any>[]; headers: string[]; }
interface ImportResult { type: string; created_processes?: number; created_deadlines?: number; created_events?: number; created_entries?: number; errors: string[]; totalBatches: number; processedBatches: number; }

function detectFileType(fileName: string, headers: string[]): FileType {
  const lowerName = fileName.toLowerCase();
  const headerStr = headers.join(' ').toLowerCase();
  if (lowerName.includes('processo') || headerStr.includes('nro. processo') || headerStr.includes('parte contraria')) return 'processos';
  if (lowerName.includes('agendamento') || headerStr.includes('tipo_agenda')) return 'agendamentos';
  if (lowerName.includes('timesheet') || headerStr.includes('profissional')) return 'timesheet-reconcile';
  return 'agendamentos';
}

const TYPE_LABELS: Record<string, string> = { agendamentos: 'Agendamentos', timesheet: 'Timesheet', 'timesheet-reconcile': 'Timesheet + Reconciliação', processos: 'Processos + Pastas Drive' };
const BATCH_SIZE = 50;

export function BulkImportXlsxDialog({ open, onOpenChange }: BulkImportXlsxDialogProps) {
  const [phase, setPhase] = useState<ImportPhase>('upload');
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [currentFile, setCurrentFile] = useState('');
  const { profile } = useAuth();

  const reset = useCallback(() => { setPhase('upload'); setFiles([]); setProgress(0); setResults([]); setCurrentFile(''); }, []);
  const handleClose = useCallback((o: boolean) => { if (!o) reset(); onOpenChange(o); }, [onOpenChange, reset]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length) return;
    const parsed: ParsedFile[] = [];
    for (const file of Array.from(selectedFiles)) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        if (file.name.toLowerCase().endsWith('.csv')) {
          const text = new TextDecoder().decode(buffer);
          const csvBlob = new Blob([text], { type: 'text/csv' });
          await workbook.csv.read(csvBlob.stream() as any);
        } else { await workbook.xlsx.load(buffer); }
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount === 0) throw new Error('Planilha vazia');
        const headerRow = worksheet.getRow(1);
        const headers: string[] = [];
        headerRow.eachCell((cell, colNumber) => { headers[colNumber - 1] = String(cell.value ?? '').trim(); });
        const jsonData: Record<string, any>[] = [];
        for (let i = 2; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);
          const record: Record<string, any> = {};
          let hasValue = false;
          row.eachCell((cell, colNumber) => { const key = headers[colNumber - 1]; if (key) { record[key] = cell.value; hasValue = true; } });
          if (hasValue) jsonData.push(record);
        }
        parsed.push({ name: file.name, type: detectFileType(file.name, headers), rows: jsonData, headers });
      } catch (err: any) { toast({ title: 'Erro ao ler arquivo', description: `${file.name}: ${err.message}`, variant: 'destructive' }); }
    }
    if (parsed.length > 0) { setFiles(parsed); setPhase('preview'); }
  }, []);

  const startImport = useCallback(async () => {
    setPhase('importing'); setProgress(0);
    const allResults: ImportResult[] = [];
    let totalBatches = files.reduce((acc, f) => acc + Math.ceil(f.rows.length / BATCH_SIZE), 0);
    let processedTotal = 0;
    for (const file of files) {
      setCurrentFile(file.name);
      const batches = Math.ceil(file.rows.length / BATCH_SIZE);
      const fileResult: ImportResult = { type: file.type, errors: [], totalBatches: batches, processedBatches: 0 };
      for (let i = 0; i < batches; i++) {
        const batch = file.rows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        try {
          const fn = file.type === 'processos' ? 'import-csv-processes' : 'bulk-import-data';
          const body = file.type === 'processos' ? { rows: batch, userEmail: profile?.email || '' } : { type: file.type, rows: batch };
          const { data, error } = await supabase.functions.invoke(fn, { body });
          if (error) fileResult.errors.push(`Lote ${i + 1}: ${error.message}`);
          else if (data?.errors?.length) fileResult.errors.push(...data.errors);
        } catch (err: any) { fileResult.errors.push(`Lote ${i + 1}: ${err.message}`); }
        fileResult.processedBatches = i + 1;
        processedTotal++;
        setProgress(Math.round((processedTotal / totalBatches) * 100));
      }
      allResults.push(fileResult);
    }
    setResults(allResults); setPhase('done');
    toast({ title: 'Importação concluída' });
  }, [files, profile]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" />Importação em Massa (XLSX / CSV)</DialogTitle>
          <DialogDescription>Importe agendamentos, timesheet ou processos.</DialogDescription>
        </DialogHeader>

        {phase === 'upload' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="w-12 h-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">Selecione os arquivos XLSX ou CSV</p>
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx,.xls,.csv" multiple onChange={handleFileChange} className="hidden" />
              <Button asChild variant="outline"><span>Selecionar Arquivos</span></Button>
            </label>
          </div>
        )}

        {phase === 'preview' && (
          <div className="space-y-4">
            {files.map((file, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /><span className="font-medium text-sm">{file.name}</span></div>
                  <Badge variant="outline">{TYPE_LABELS[file.type]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{file.rows.length.toLocaleString()} linhas</p>
                <div className="overflow-auto max-h-40">
                  <Table><TableHeader><TableRow>{file.headers.slice(0, 6).map((h) => <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>{file.rows.slice(0, 3).map((row, ri) => (
                      <TableRow key={ri}>{file.headers.slice(0, 6).map((h) => <TableCell key={h} className="text-xs whitespace-nowrap max-w-[150px] truncate">{String(row[h] ?? '')}</TableCell>)}</TableRow>
                    ))}</TableBody>
                  </Table>
                </div>
              </div>
            ))}
            <DialogFooter>
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button onClick={startImport}>Avançar ({files.reduce((a, f) => a + f.rows.length, 0).toLocaleString()} linhas)</Button>
            </DialogFooter>
          </div>
        )}

        {phase === 'importing' && (
          <div className="space-y-4 py-4">
            <div className="text-center"><p className="text-sm font-medium">Importando: {currentFile}</p><p className="text-xs text-muted-foreground mt-1">{progress}%</p></div>
            <Progress value={progress} className="h-3" />
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-4">
            {results.map((r, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /><span className="font-medium text-sm">{TYPE_LABELS[r.type] || r.type}</span></div>
                {r.errors.length > 0 && <div className="flex items-center gap-1 text-destructive text-sm"><AlertCircle className="w-3 h-3" /><span>{r.errors.length} erro(s)</span></div>}
              </div>
            ))}
            <DialogFooter><Button onClick={() => handleClose(false)}>Fechar</Button></DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default BulkImportXlsxDialog;
