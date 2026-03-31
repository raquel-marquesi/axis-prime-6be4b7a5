import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, User, Users, Calendar, Building2, Briefcase, Scale, Clock, FolderOpen, Link2, Plus, Trash2, History, FileText, ExternalLink } from 'lucide-react';
import { Process } from '@/hooks/useProcesses';
import { useProcessWithFolder } from '@/hooks/useProcessWithFolder';
import { useRelatedProcesses } from '@/hooks/useRelatedProcesses';
import { useProfiles } from '@/hooks/useProfiles';
import { formatCPF } from '@/lib/validators';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DeadlinesTab } from './DeadlinesTab';
import { ProcessTimesheetTab } from './ProcessTimesheetTab';

interface ProcessDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  process: Process | null;
  onEdit: (process: Process) => void;
  defaultTab?: 'info' | 'related' | 'deadlines';
}

export function ProcessDetailsDialog({ open, onOpenChange, process, onEdit, defaultTab = 'info' }: ProcessDetailsDialogProps) {
  const { isLeaderOrAbove } = useAuth();
  const { getInitials, getName } = useProfiles();
  const { linkFolderToProcess } = useProcessWithFolder();
  const { relatedProcesses, createRelatedProcess, deleteRelatedProcess } = useRelatedProcesses(process?.id);
  const [newRelatedNumero, setNewRelatedNumero] = useState('');
  const [newRelatedObs, setNewRelatedObs] = useState('');
  const [deleteRelatedId, setDeleteRelatedId] = useState<string | null>(null);

  if (!process) return null;

  const getClientName = () => {
    if (!process.client) return '-';
    return process.client.tipo === 'juridica' ? process.client.razao_social : process.client.nome;
  };
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try { return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return dateStr; }
  };
  const labels = process.area === 'civel' ? { claimant: 'Autor', defendants: 'Réus' } : { claimant: 'Reclamante', defendants: 'Reclamadas' };

  const handleAddRelated = async () => {
    if (!newRelatedNumero.trim() || !process) return;
    await createRelatedProcess.mutateAsync({ process_id: process.id, numero_processo_relacionado: newRelatedNumero.trim(), observacoes: newRelatedObs.trim() || undefined });
    setNewRelatedNumero(''); setNewRelatedObs('');
  };

  const processInfo = { numero_processo: process.numero_processo, reclamante_nome: process.reclamante_nome, numero_pasta: process.numero_pasta };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2"><FolderOpen className="w-5 h-5" />Pasta #{process.numero_pasta}</DialogTitle>
              <div className="flex items-center gap-2">
                {process.drive_folder_id ? (
                  <Button variant="outline" size="sm" onClick={() => window.open(`https://drive.google.com/drive/folders/${process.drive_folder_id}`, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-1" />Abrir Pasta
                  </Button>
                ) : isLeaderOrAbove() && (
                  <Button variant="outline" size="sm" onClick={async () => {
                    const clientName = process.client?.tipo === 'juridica' ? process.client.razao_social || 'Cliente' : process.client?.nome || 'Cliente';
                    await linkFolderToProcess.mutateAsync({ processId: process.id, clientName, processNumber: process.numero_processo, folderNumber: process.numero_pasta });
                  }} disabled={linkFolderToProcess.isPending}>
                    <FolderOpen className="w-4 h-4 mr-1" />{linkFolderToProcess.isPending ? 'Criando...' : 'Criar Pasta'}
                  </Button>
                )}
                {isLeaderOrAbove() && (
                  <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); onEdit(process); }}>
                    <Pencil className="w-4 h-4 mr-1" />Editar
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info" className="gap-1"><FileText className="w-4 h-4" /> Informações</TabsTrigger>
              <TabsTrigger value="related" className="gap-1"><Link2 className="w-4 h-4" /> Relacionados</TabsTrigger>
              <TabsTrigger value="deadlines" className="gap-1"><History className="w-4 h-4" /> Prazos</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 pt-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="text-sm">
                  {process.area === 'trabalhista' ? <><Briefcase className="w-3 h-3 mr-1" /> Trabalhista</> : <><Scale className="w-3 h-3 mr-1" /> Cível</>}
                </Badge>
                <Badge variant={process.tipo_acao === 'individual' ? 'default' : 'secondary'} className="text-sm">
                  {process.tipo_acao === 'individual' ? <><User className="w-3 h-3 mr-1" /> Individual</> : <><Users className="w-3 h-3 mr-1" /> Coletiva</>}
                </Badge>
                <span className="tabular-nums tracking-wide text-lg font-medium">{process.numero_processo}</span>
              </div>
              {process.codigo_externo && <div className="text-sm text-muted-foreground"><span className="font-medium">Código Externo:</span> {process.codigo_externo}</div>}
              <Separator />
              <div><h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1"><Building2 className="w-4 h-4" /> Cliente</h4><p>{getClientName()}</p></div>
              <div><h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1"><User className="w-4 h-4" /> {labels.claimant}</h4>
                <p className="font-medium">{process.reclamante_nome}</p>
                {process.area === 'trabalhista' && process.reclamante_cpf && <p className="text-sm text-muted-foreground tabular-nums tracking-wide">CPF: {formatCPF(process.reclamante_cpf)}</p>}
              </div>
              {process.reclamadas?.length > 0 && (
                <div><h4 className="text-sm font-medium text-muted-foreground mb-2">{labels.defendants} ({process.reclamadas.length})</h4>
                  <div className="space-y-1">{process.reclamadas.map((r, i) => <div key={i} className="bg-muted/50 rounded px-3 py-2 text-sm">{r}</div>)}</div>
                </div>
              )}
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-2"><Clock className="w-3 h-3" /><span>Cadastrado em: {formatDateTime(process.created_at)}</span></div>
                <p>Atualizado em: {formatDateTime(process.updated_at)}</p>
              </div>
            </TabsContent>

            <TabsContent value="related" className="space-y-4 pt-4">
              <div className="text-sm text-muted-foreground mb-4">Vincule processos relacionados.</div>
              {relatedProcesses.length > 0 ? (
                <div className="space-y-2">{relatedProcesses.map((rel) => (
                  <div key={rel.id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                    <div className="flex-1"><p className="tabular-nums tracking-wide text-sm">{rel.numero_processo_relacionado}</p>{rel.observacoes && <p className="text-xs text-muted-foreground">{rel.observacoes}</p>}</div>
                    <div className="flex items-center gap-2">
                      {isLeaderOrAbove() && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteRelatedId(rel.id)}><Trash2 className="w-3 h-3" /></Button>}
                    </div>
                  </div>
                ))}</div>
              ) : <div className="text-center py-8 text-muted-foreground text-sm">Nenhum processo relacionado.</div>}
              {isLeaderOrAbove() && (
                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-medium">Adicionar Processo Relacionado</Label>
                  <div className="grid gap-3">
                    <Input placeholder="Número do processo" value={newRelatedNumero} onChange={(e) => setNewRelatedNumero(e.target.value)} />
                    <Input placeholder="Observações (opcional)" value={newRelatedObs} onChange={(e) => setNewRelatedObs(e.target.value)} />
                    <Button onClick={handleAddRelated} disabled={!newRelatedNumero.trim() || createRelatedProcess.isPending} size="sm"><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="deadlines" className="pt-4">
              <DeadlinesTab processId={process.id} processInfo={processInfo}
                driveFolderUrl={process.drive_folder_id ? `https://drive.google.com/drive/folders/${process.drive_folder_id}` : undefined} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRelatedId} onOpenChange={() => setDeleteRelatedId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover processo relacionado?</AlertDialogTitle>
          <AlertDialogDescription>O vínculo será removido.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteRelatedId) { deleteRelatedProcess.mutate(deleteRelatedId); setDeleteRelatedId(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

export default ProcessDetailsDialog;
