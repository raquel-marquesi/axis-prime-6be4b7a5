import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTreasury } from '@/hooks/useTreasury';
import { useBankAccountsConfig } from '@/hooks/useBankAccountsConfig';
import { TransferFormDialog } from './TransferFormDialog';
import { Plus, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Landmark } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const TIPO_LABELS: Record<string, string> = { entrada: 'Entrada', saida: 'Saída', transferencia: 'Transferência' };

export function TreasuryTab() {
  const { entries, isLoading: loadingEntries } = useTreasury();
  const { bankAccounts, isLoading: loadingAccounts } = useBankAccountsConfig();
  const [showForm, setShowForm] = useState(false);

  const accountMap = useMemo(() => { const map: Record<string, string> = {}; bankAccounts.forEach(a => { map[a.id] = `${a.banco} - Ag ${a.agencia} / CC ${a.conta}`; }); return map; }, [bankAccounts]);

  const balances = useMemo(() => {
    const bal: Record<string, number> = {};
    bankAccounts.filter(a => a.is_active).forEach(a => { bal[a.id] = 0; });
    entries.forEach(e => {
      if (e.tipo === 'entrada') bal[e.bank_account_id] = (bal[e.bank_account_id] || 0) + e.valor;
      else if (e.tipo === 'saida') bal[e.bank_account_id] = (bal[e.bank_account_id] || 0) - e.valor;
      else if (e.tipo === 'transferencia') { bal[e.bank_account_id] = (bal[e.bank_account_id] || 0) - e.valor; if (e.conta_destino_id) bal[e.conta_destino_id] = (bal[e.conta_destino_id] || 0) + e.valor; }
    });
    return bal;
  }, [entries, bankAccounts]);

  const totalBalance = Object.values(balances).reduce((s, v) => s + v, 0);
  if (loadingEntries || loadingAccounts) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5"><CardContent className="p-4 flex items-center gap-3"><Landmark className="h-6 w-6 text-primary" /><div><p className="text-lg font-bold">{fmt(totalBalance)}</p><p className="text-xs text-muted-foreground">Saldo Total</p></div></CardContent></Card>
        {bankAccounts.filter(a => a.is_active).map(account => (
          <Card key={account.id}><CardContent className="p-4"><p className="text-sm font-medium truncate">{account.banco}</p><p className="text-xs text-muted-foreground">Ag {account.agencia} / CC {account.conta}</p><p className={`text-lg font-bold mt-1 ${(balances[account.id] || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(balances[account.id] || 0)}</p></CardContent></Card>
        ))}
      </div>
      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" /> Nova Movimentação</Button></div>
      <Card><CardHeader><CardTitle>Movimentações</CardTitle></CardHeader><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Conta Origem</TableHead><TableHead>Conta Destino</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
          <TableBody>
            {entries.map(entry => (<TableRow key={entry.id}><TableCell className="text-sm">{format(parseISO(entry.data_movimentacao), 'dd/MM/yyyy')}</TableCell><TableCell><Badge variant={entry.tipo === 'entrada' ? 'default' : entry.tipo === 'saida' ? 'destructive' : 'secondary'} className="flex items-center gap-1 w-fit">{entry.tipo === 'entrada' && <ArrowUpCircle className="h-3 w-3" />}{entry.tipo === 'saida' && <ArrowDownCircle className="h-3 w-3" />}{entry.tipo === 'transferencia' && <ArrowLeftRight className="h-3 w-3" />}{TIPO_LABELS[entry.tipo] || entry.tipo}</Badge></TableCell><TableCell className="text-sm">{accountMap[entry.bank_account_id] || '-'}</TableCell><TableCell className="text-sm">{entry.conta_destino_id ? accountMap[entry.conta_destino_id] || '-' : '-'}</TableCell><TableCell className="text-sm">{entry.descricao || '-'}</TableCell><TableCell className={`text-right text-sm font-medium ${entry.tipo === 'entrada' ? 'text-green-600' : entry.tipo === 'saida' ? 'text-red-600' : ''}`}>{entry.tipo === 'entrada' ? '+' : entry.tipo === 'saida' ? '-' : ''}{fmt(entry.valor)}</TableCell></TableRow>))}
            {entries.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma movimentação registrada</TableCell></TableRow>)}
          </TableBody>
        </Table></CardContent></Card>
      <TransferFormDialog open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}