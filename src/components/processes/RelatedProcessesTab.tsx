import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2 } from 'lucide-react';
import { useRelatedProcesses } from '@/hooks/useRelatedProcesses';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';

interface RelatedProcessesTabProps {
  processId: string;
}

export function RelatedProcessesTab({ processId }: RelatedProcessesTabProps) {
  const { can } = useAuth();
  const { getInitials, getName } = useProfiles();
  const { relatedProcesses, createRelatedProcess, deleteRelatedProcess } = useRelatedProcesses(processId);
  
  const [newRelatedNumero, setNewRelatedNumero] = useState('');
  const [newRelatedObs, setNewRelatedObs] = useState('');
  const [deleteRelatedId, setDeleteRelatedId] = useState<string | null>(null);

  const handleAddRelated = async () => {
    if (!newRelatedNumero.trim()) return;
    await createRelatedProcess.mutateAsync({
      process_id: processId,
      numero_processo_relacionado: newRelatedNumero.trim(),
      observacoes: newRelatedObs.trim() || undefined,
    });
    setNewRelatedNumero('');
    setNewRelatedObs('');
  };

  const handleConfirmDelete = async () => {
    if (deleteRelatedId) {
      await deleteRelatedProcess.mutateAsync(deleteRelatedId);
      setDeleteRelatedId(null);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Vincule processos de execução provisória ou outros processos relacionados.
        </div>

        {relatedProcesses.length > 0 ? (
          <div className="space-y-2">
            {relatedProcesses.map((rel) => {
              const relCreatorInitials = getInitials(rel.created_by);
              const relCreatorName = getName(rel.created_by);
              return (
                <div key={rel.id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                  <div className="flex-1">
                    <p className="tabular-nums tracking-wide text-sm">{rel.numero_processo_relacionado}</p>
                    {rel.observacoes && <p className="text-xs text-muted-foreground">{rel.observacoes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background text-[10px] font-medium cursor-help">
                          {relCreatorInitials}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent><p>Adicionado por: {relCreatorName}</p></TooltipContent>
                    </Tooltip>
                    {can('processos', 'editar') && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => setDeleteRelatedId(rel.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhum processo relacionado vinculado.</div>
        )}

        {can('processos', 'editar') && (
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-medium">Adicionar Processo Relacionado</Label>
            <div className="grid gap-3">
              <Input placeholder="Número do processo de execução" value={newRelatedNumero} onChange={(e) => setNewRelatedNumero(e.target.value)} />
              <Input placeholder="Observações (opcional)" value={newRelatedObs} onChange={(e) => setNewRelatedObs(e.target.value)} />
              <Button onClick={handleAddRelated} disabled={!newRelatedNumero.trim() || createRelatedProcess.isPending} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteRelatedId} onOpenChange={() => setDeleteRelatedId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover processo relacionado?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
