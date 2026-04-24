import { TimesheetEntry } from '@/hooks/useTimesheet';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, ExternalLink, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface TimesheetTableProps {
  entries: TimesheetEntry[];
  onEdit: (entry: TimesheetEntry) => void;
  onDelete: (entry: TimesheetEntry) => void;
}

export function TimesheetTable({ entries, onEdit, onDelete }: TimesheetTableProps) {
  const { can } = useAuth();

  const formatDate = (dateStr: string) => {
    try { return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR }); } catch { return dateStr; }
  };

  const openDriveFolder = (folderId: string | null | undefined) => {
    if (folderId) window.open(`https://drive.google.com/drive/folders/${folderId}`, '_blank');
  };

  const getClientName = (entry: TimesheetEntry) => {
    if (!entry.process?.client) return '-';
    return entry.process.client.razao_social || entry.process.client.nome || '-';
  };

  if (entries.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">Nenhum lançamento encontrado para o período selecionado.</div>;
  }

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Data</TableHead>
              <TableHead className="w-20">Pasta</TableHead>
              <TableHead>Processo</TableHead>
              <TableHead>Atividade</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-16 text-center">Peso</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="tabular-nums tracking-wide text-sm">{formatDate(entry.data_atividade)}</TableCell>
                <TableCell className="tabular-nums tracking-wide text-sm">{entry.process?.numero_pasta || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate max-w-[200px]">{entry.process?.numero_processo || '-'}</span>
                      {entry.process?.tipo_acao === 'coletiva' && (
                        <Tooltip><TooltipTrigger><Badge variant="outline" className="h-5"><Users className="w-3 h-3" /></Badge></TooltipTrigger><TooltipContent>Ação Coletiva</TooltipContent></Tooltip>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{entry.reclamante_nome || entry.process?.reclamante_nome || '-'}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{getClientName(entry)}</span>
                  </div>
                </TableCell>
                <TableCell><span className="text-sm">{entry.activity_type?.name || '-'}</span></TableCell>
                <TableCell>
                  <Tooltip><TooltipTrigger asChild><span className="text-sm truncate max-w-[250px] block cursor-help">{entry.descricao}</span></TooltipTrigger><TooltipContent className="max-w-md"><p className="whitespace-pre-wrap">{entry.descricao}</p></TooltipContent></Tooltip>
                </TableCell>
                <TableCell className="text-center"><Badge variant="secondary">{entry.activity_type?.weight || 0}</Badge></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {entry.process?.drive_folder_id && (
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDriveFolder(entry.process?.drive_folder_id)}><ExternalLink className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Abrir pasta no Drive</TooltipContent></Tooltip>
                    )}
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(entry)}><Edit2 className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
                    {can('timesheet', 'editar') && (
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(entry)}><Trash2 className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
