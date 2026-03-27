import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Pencil, Trash2, User, Users, Briefcase, Scale, FolderOpen } from 'lucide-react';
import { Process, useProcesses } from '@/hooks/useProcesses';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles } from '@/hooks/useProfiles';
import { formatCPF } from '@/lib/validators';
import { useState } from 'react';

interface ProcessesTableProps {
  processes: Process[];
  onViewDetails: (process: Process) => void;
  onEdit: (process: Process) => void;
}

export function ProcessesTable({ processes, onViewDetails, onEdit }: ProcessesTableProps) {
  const { isAdmin, hasRole } = useAuth();
  const canEditProcesses = isAdmin() || hasRole('socio') || hasRole('coordenador') || hasRole('lider');
  const { deleteProcess } = useProcesses();
  const { getInitials, getName } = useProfiles();
  const [processToDelete, setProcessToDelete] = useState<Process | null>(null);

  const getClientName = (process: Process) => {
    if (!process.client) return '-';
    return process.client.tipo === 'juridica' ? process.client.razao_social : process.client.nome;
  };

  const handleDeleteConfirm = async () => {
    if (processToDelete) {
      await deleteProcess.mutateAsync(processToDelete.id);
      setProcessToDelete(null);
    }
  };

  if (processes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground">Nenhum processo encontrado</p>
        <p className="text-sm text-muted-foreground/60">Ajuste os filtros ou cadastre um novo processo</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">Pasta</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Número do Processo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Reclamante</TableHead>
              <TableHead>Reclamada</TableHead>
              <TableHead>ID Pasta</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processes.map((process) => (
              <TableRow key={process.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => {
                if (process.drive_folder_id) {
                  window.open(`https://drive.google.com/drive/folders/${process.drive_folder_id}`, '_blank');
                } else {
                  onViewDetails(process);
                }
              }}>
                <TableCell>
                  <Badge variant="outline" className="gap-1 font-mono">
                    <FolderOpen className="w-3 h-3" />{process.numero_pasta}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1">
                    {process.area === 'trabalhista' ? <><Briefcase className="w-3 h-3" /> Trabalhista</> : <><Scale className="w-3 h-3" /> Cível</>}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={process.tipo_acao === 'individual' ? 'default' : 'secondary'}>
                    {process.tipo_acao === 'individual' ? <><User className="w-3 h-3 mr-1" /> Individual</> : <><Users className="w-3 h-3 mr-1" /> Coletiva</>}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{process.numero_processo}</TableCell>
                <TableCell>{getClientName(process)}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{process.reclamante_nome}</span>
                    {process.area === 'trabalhista' && process.reclamante_cpf && (
                      <span className="text-xs text-muted-foreground font-mono">{formatCPF(process.reclamante_cpf)}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {process.reclamadas?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {process.reclamadas.slice(0, 2).map((r, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{r.length > 20 ? r.slice(0, 20) + '...' : r}</Badge>
                      ))}
                      {process.reclamadas.length > 2 && <Badge variant="outline" className="text-xs">+{process.reclamadas.length - 2}</Badge>}
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {process.drive_folder_id ? (
                    <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px] inline-block" title={process.drive_folder_id}>
                      {process.drive_folder_id.slice(0, 12)}…
                    </span>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {canEditProcesses && (
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(process); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {hasRole('admin') && (
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setProcessToDelete(process); }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!processToDelete} onOpenChange={() => setProcessToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o processo <strong>{processToDelete?.numero_processo}</strong>?<br />Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

export default ProcessesTable;
