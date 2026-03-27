import { useState } from 'react';
import { Search, Plus, Building2, MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounts, Account } from '@/hooks/useAccounts';
import { AccountFormDialog } from './AccountFormDialog';
import { AccountDetailsDialog } from './AccountDetailsDialog';

const statusColors: Record<string, string> = {
  ativa: 'bg-green-500/10 text-green-700 border-green-200',
  inativa: 'bg-red-500/10 text-red-700 border-red-200',
  prospeccao: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
};

const statusLabels: Record<string, string> = {
  ativa: 'Ativa',
  inativa: 'Inativa',
  prospeccao: 'Prospecção',
};

export function AccountsTable() {
  const { accounts, isLoading, deleteAccount } = useAccounts();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [detailsAccount, setDetailsAccount] = useState<Account | null>(null);

  const filtered = accounts.filter((a) => {
    const matchesSearch = a.nome.toLowerCase().includes(search.toLowerCase()) ||
      a.responsavel_nome.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar contas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="inativa">Inativa</SelectItem>
              <SelectItem value="prospeccao">Prospecção</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditingAccount(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Conta
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada</TableCell></TableRow>
            ) : (
              filtered.map((account) => (
                <TableRow key={account.id} className="cursor-pointer" onClick={() => setDetailsAccount(account)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {account.nome}
                    </div>
                  </TableCell>
                  <TableCell>{account.tipo_conta || '—'}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{account.responsavel_nome}</p>
                      {account.responsavel_email && (
                        <p className="text-xs text-muted-foreground">{account.responsavel_email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[account.status]}>
                      {statusLabels[account.status] || account.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDetailsAccount(account); }}>
                          <Eye className="h-4 w-4 mr-2" /> Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingAccount(account); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteAccount.mutate(account.id); }}>
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AccountFormDialog open={formOpen} onOpenChange={setFormOpen} account={editingAccount} />
      {detailsAccount && (
        <AccountDetailsDialog open={!!detailsAccount} onOpenChange={() => setDetailsAccount(null)} account={detailsAccount} />
      )}
    </div>
  );
}