import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const DIGIMAIS_RECORDS = [
  { numero_processo: '0020336-82.2021.5.04.0024', parte_contraria: 'ROSANE OLIVEIRA WEBSTER', data_agenda: '2026-02-07', tipo_agenda: 'Baixar provisão', descricao: 'Baixar provisão do sistema', codigo_externo: '266240' },
  { numero_processo: '1000194-20.2026.5.02.0089', parte_contraria: 'MONAGI SILVERIO DE CARVALHO', data_agenda: '2026-02-18', tipo_agenda: 'Liquidar inicial', descricao: 'Liquidar inicial conforme petição', codigo_externo: '331622' },
];

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }
interface ImportResult { created_processes: number; created_deadlines: number; created_events: number; errors: string[]; }

export function BatchImportProcessesDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    setIsLoading(true); setResult(null);
    try {
      const { data: client } = await supabase.from('clients').select('id').ilike('razao_social', '%DIGIMAIS%').maybeSingle();
      if (!client) { toast({ title: 'Erro', description: 'Cliente Banco Digimais não encontrado.', variant: 'destructive' }); setIsLoading(false); return; }
      const { data, error } = await supabase.functions.invoke('batch-import-processes', { body: { client_id: client.id, records: DIGIMAIS_RECORDS } });
      if (error) throw error;
      setResult(data as ImportResult);
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      toast({ title: 'Importação concluída', description: `${data.created_processes} processos criados.` });
    } catch (err) { toast({ title: 'Erro na importação', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' }); }
    finally { setIsLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Importar Processos - Teste Digimais</DialogTitle>
          <DialogDescription>{DIGIMAIS_RECORDS.length} registros pré-mapeados.</DialogDescription></DialogHeader>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">{DIGIMAIS_RECORDS.map((r, i) => (
            <div key={i} className="flex items-start gap-3 p-2 rounded border text-sm">
              <span className="tabular-nums tracking-wide text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
              <div className="min-w-0"><p className="font-medium truncate">{r.numero_processo}</p><p className="text-muted-foreground truncate">{r.parte_contraria}</p></div>
            </div>
          ))}</div>
        </ScrollArea>
        {result && (
          <div className="rounded-md border p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 text-green-700"><CheckCircle2 className="w-4 h-4" /><span>{result.created_processes} processos</span></div>
            {result.errors.length > 0 && <div className="text-destructive space-y-1 mt-2"><AlertCircle className="w-4 h-4 inline mr-1" />Erros:
              {result.errors.map((e, i) => <p key={i} className="text-xs ml-6">{e}</p>)}</div>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleImport} disabled={isLoading}><Upload className="w-4 h-4 mr-2" />{isLoading ? 'Importando...' : 'Importar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BatchImportProcessesDialog;
