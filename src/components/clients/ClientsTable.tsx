import { useState, useCallback } from 'react';
import { Client, useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCPF, formatCNPJ } from '@/lib/validators';
import { useProfiles } from '@/hooks/useProfiles';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Eye, Pencil, Building2, User, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ClientsTableProps {
  clients: Client[];
  onViewDetails: (client: Client) => void;
  onEdit: (client: Client) => void;
}

export function ClientsTable({ clients, onViewDetails, onEdit }: ClientsTableProps) {
  const { can } = useAuth();
  const { deleteClient, updateClient } = useClients();
  const { toast } = useToast();
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [linkedProcesses, setLinkedProcesses] = useState<number | null>(null);
  const [checkingProcesses, setCheckingProcesses] = useState(false);
  const { getInitials, getName } = useProfiles();

  const getDisplayName = (client: Client) => client.tipo === 'fisica' ? client.nome : client.razao_social;
  const getDocument = (client: Client) => {
    if (client.tipo === 'fisica' && client.cpf) return formatCPF(client.cpf);
    if (client.tipo === 'juridica' && client.cnpj) return formatCNPJ(client.cnpj);
    return '-';
  };

  const handleRequestDelete = useCallback(async (client: Client) => {
    setClientToDelete(client);
    setLinkedProcesses(null);
    setCheckingProcesses(true);
    try {
      const { count } = await supabase.from('processes').select('*', { count: 'exact', head: true }).eq('id_cliente', client.id);
      setLinkedProcesses(count ?? 0);
    } catch { setLinkedProcesses(0); } finally { setCheckingProcesses(false); }
  }, []);

  const handleDeactivate = async () => {
    if (!clientToDelete) return;
    await updateClient.mutateAsync({ id: clientToDelete.id, tipo: clientToDelete.tipo, is_active: false });
    setClientToDelete(null);
    toast({ title: 'Cliente desativado', description: 'O cliente foi desativado com sucesso.' });
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    await deleteClient.mutateAsync(clientToDelete.id);
    setClientToDelete(null);
  };

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Building2 className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum cliente encontrado</p>
        <p className="text-sm">Tente ajustar os filtros ou adicione um novo cliente.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Tipo</TableHead>
              <TableHead>Nome / Razão Social</TableHead>
              <TableHead>CPF / CNPJ</TableHead>
              <TableHead>Filial</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead>Grupo / Contrato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]">Por</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => {
              const creatorInitials = getInitials(client.created_by);
              const creatorName = getName(client.created_by);
              return (
                <TableRow key={client.id}>
                  <TableCell>
                    {client.tipo === 'fisica' ? <User className="w-4 h-4 text-blue-500" /> : <Building2 className="w-4 h-4 text-purple-500" />}
                  </TableCell>
                  <TableCell className="font-medium">
                    {getDisplayName(client)}
                    {client.tipo === 'juridica' && client.nome_fantasia && (
                      <span className="block text-xs text-muted-foreground">{client.nome_fantasia}</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums tracking-wide text-sm">{getDocument(client)}</TableCell>
                  <TableCell>
                    {client.branch_nomes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {client.branch_nomes.map((nome, i) => <Badge key={i} variant="outline" className="text-xs">{nome}</Badge>)}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{client.centro_custo || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client.economic_group_nome && <Badge variant="secondary" className="text-xs">{client.economic_group_nome}</Badge>}
                      {client.contract_key_nome && <Badge variant="outline" className="text-xs">{client.contract_key_nome}</Badge>}
                      {!client.economic_group_nome && !client.contract_key_nome && '—'}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={client.is_active ? 'default' : 'secondary'}>{client.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium cursor-help">{creatorInitials}</span>
                      </TooltipTrigger>
                      <TooltipContent><p>Cadastrado por: {creatorName}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onViewDetails(client)}><Eye className="w-4 h-4" /></Button>
                      {can('crm', 'editar') && <Button variant="ghost" size="icon" onClick={() => onEdit(client)}><Pencil className="w-4 h-4" /></Button>}
                      {can('crm', 'deletar') && <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleRequestDelete(client)}><Trash2 className="w-4 h-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              {checkingProcesses ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Verificando processos vinculados...</span>
              ) : linkedProcesses && linkedProcesses > 0 ? (
                <>O cliente <strong>{clientToDelete ? getDisplayName(clientToDelete) : ''}</strong> possui <strong>{linkedProcesses}</strong> processo{linkedProcesses !== 1 ? 's' : ''} vinculado{linkedProcesses !== 1 ? 's' : ''} e <strong>não pode ser excluído</strong>.<br /><br />Você pode <strong>desativá-lo</strong> em vez de excluir.</>
              ) : (
                <>Tem certeza que deseja excluir o cliente <strong>{clientToDelete ? getDisplayName(clientToDelete) : ''}</strong>?<br /><br />Esta ação é irreversível e também removerá todos os contatos e documentos associados.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {linkedProcesses && linkedProcesses > 0 ? (
              <AlertDialogAction onClick={handleDeactivate} disabled={updateClient.isPending}>
                {updateClient.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Desativar Cliente
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteClient.isPending || checkingProcesses}>
                {deleteClient.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

export default ClientsTable;
