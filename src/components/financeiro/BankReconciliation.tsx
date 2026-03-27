import { useState } from 'react';
import { useBankReconciliation, BankStatementEntry } from '@/hooks/useBankReconciliation';
import { useInvoices } from '@/hooks/useInvoices';
import { useExpenses } from '@/hooks/useExpenses';
import { BankStatementUpload } from './BankStatementUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Plus, ArrowLeft, Link2, Unlink, EyeOff, CheckCircle2, Clock, Ban, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function BankReconciliation() {
  const { statements, isLoading, useStatementEntries, uploadStatement, matchEntry, unmatchEntry, ignoreEntry } = useBankReconciliation();
  const { invoices } = useInvoices();
  const { expenses } = useExpenses();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [matchDialogEntry, setMatchDialogEntry] = useState<BankStatementEntry | null>(null);
  const entriesQuery = useStatementEntries(selectedStatementId);
  const entries = entriesQuery.data || [];
  const selectedStatement = statements.find(s => s.id === selectedStatementId);
  const conciliadoCount = entries.filter(e => e.status === 'conciliado').length;
  const pendenteCount = entries.filter(e => e.status === 'pendente').length;
  const ignoradoCount = entries.filter(e => e.status === 'ignorado').length;
  const handleMatch = (entryId: string, invoiceId?: string, expenseId?: string) => { matchEntry.mutate({ entryId, invoiceId, expenseId }); setMatchDialogEntry(null); };
  const getCompatibleMatches = (entry: BankStatementEntry) => {
    if (entry.tipo === 'credito') {
      return invoices.filter(inv => { if (!inv.valor) return false; return Math.abs(Number(inv.valor) - entry.valor) < 0.01; }).map(inv => ({ id: inv.id, label: `NF ${inv.numero_nf || 'S/N'} - R$ ${Number(inv.valor).toFixed(2)} - Venc: ${inv.data_vencimento || '-'}`, type: 'invoice' as const }));
    } else {
      return expenses.filter(exp => { if (!exp.valor) return false; return Math.abs(Number(exp.valor) - Math.abs(entry.valor)) < 0.01; }).map(exp => ({ id: exp.id, label: `${exp.descricao} - R$ ${Number(exp.valor).toFixed(2)} - Venc: ${exp.data_vencimento || '-'}`, type: 'expense' as const }));
    }
  };
  const statusBadge = (status: string) => {
    switch (status) {
      case 'conciliado': return <Badge className="bg-green-500/15 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Conciliado</Badge>;
      case 'pendente': return <Badge variant="outline" className="text-amber-600 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'ignorado': return <Badge variant="secondary"><Ban className="h-3 w-3 mr-1" />Ignorado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };
  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (selectedStatementId && selectedStatement) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4"><Button variant="ghost" size="sm" onClick={() => setSelectedStatementId(null)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button><div><h3 className="font-semibold">{selectedStatement.bank_name} - {selectedStatement.file_name}</h3><p className="text-sm text-muted-foreground">{selectedStatement.period_start && selectedStatement.period_end ? `${format(new Date(selectedStatement.period_start), 'dd/MM/yyyy')} a ${format(new Date(selectedStatement.period_end), 'dd/MM/yyyy')}` : 'Período não definido'}</p></div></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{entries.length}</div><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-600">{conciliadoCount}</div><p className="text-xs text-muted-foreground">Conciliados</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-amber-600">{pendenteCount}</div><p className="text-xs text-muted-foreground">Pendentes</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-muted-foreground">{ignoradoCount}</div><p className="text-xs text-muted-foreground">Ignorados</p></CardContent></Card>
        </div>
        <Card><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Match</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>{entriesQuery.isLoading ? (<TableRow><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) : entries.length === 0 ? (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum lançamento</TableCell></TableRow>) : entries.map(entry => (
            <TableRow key={entry.id}><TableCell className="whitespace-nowrap">{format(new Date(entry.data_transacao), 'dd/MM/yyyy')}</TableCell><TableCell className="max-w-[200px] truncate">{entry.descricao}</TableCell><TableCell className={`text-right whitespace-nowrap font-medium ${entry.valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {Math.abs(entry.valor).toFixed(2)}</TableCell><TableCell><Badge variant={entry.tipo === 'credito' ? 'default' : 'destructive'} className="text-xs">{entry.tipo === 'credito' ? 'Crédito' : 'Débito'}</Badge></TableCell><TableCell>{statusBadge(entry.status)}</TableCell><TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{entry.matched_invoice ? `NF ${entry.matched_invoice.numero_nf || 'S/N'}` : entry.matched_expense ? entry.matched_expense.descricao : '-'}</TableCell>
              <TableCell className="text-right"><div className="flex justify-end gap-1">{entry.status === 'pendente' && (<><Button size="sm" variant="ghost" onClick={() => setMatchDialogEntry(entry)} title="Vincular"><Link2 className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => ignoreEntry.mutate(entry.id)} title="Ignorar"><EyeOff className="h-4 w-4" /></Button></>)}{entry.status === 'conciliado' && (<Button size="sm" variant="ghost" onClick={() => unmatchEntry.mutate(entry.id)} title="Desvincular"><Unlink className="h-4 w-4" /></Button>)}</div></TableCell></TableRow>
          ))}</TableBody></Table></Card>
        <Dialog open={!!matchDialogEntry} onOpenChange={() => setMatchDialogEntry(null)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Vincular Lançamento</DialogTitle></DialogHeader>{matchDialogEntry && (<div className="space-y-3"><p className="text-sm text-muted-foreground">{matchDialogEntry.descricao} — R$ {Math.abs(matchDialogEntry.valor).toFixed(2)}</p><div className="space-y-2 max-h-64 overflow-y-auto">{getCompatibleMatches(matchDialogEntry).length === 0 ? (<p className="text-sm text-muted-foreground text-center py-4">Nenhum registro compatível encontrado</p>) : getCompatibleMatches(matchDialogEntry).map(m => (<Button key={m.id} variant="outline" className="w-full justify-start text-left h-auto py-2 text-sm" onClick={() => handleMatch(matchDialogEntry.id, m.type === 'invoice' ? m.id : undefined, m.type === 'expense' ? m.id : undefined)}>{m.label}</Button>))}</div></div>)}</DialogContent></Dialog>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h3 className="text-lg font-semibold">Extratos Importados</h3><Button onClick={() => setUploadOpen(true)}><Plus className="h-4 w-4 mr-2" /> Importar Extrato</Button></div>
      {statements.length === 0 ? (<Card><CardContent className="p-8 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h4 className="font-medium mb-1">Nenhum extrato importado</h4><p className="text-sm text-muted-foreground mb-4">Importe um extrato bancário CSV ou OFX para iniciar a conciliação</p><Button onClick={() => setUploadOpen(true)}><Plus className="h-4 w-4 mr-2" /> Importar Extrato</Button></CardContent></Card>) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{statements.map(stmt => (<Card key={stmt.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStatementId(stmt.id)}><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />{stmt.bank_name}</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-sm text-muted-foreground truncate">{stmt.file_name}</p>{stmt.period_start && stmt.period_end && (<p className="text-xs text-muted-foreground">{format(new Date(stmt.period_start), 'dd/MM/yyyy')} a {format(new Date(stmt.period_end), 'dd/MM/yyyy')}</p>)}<div className="flex gap-2 text-xs"><span className="text-green-600">{stmt.conciliado_count || 0} conciliados</span><span className="text-amber-600">{stmt.pendente_count || 0} pendentes</span><span className="text-muted-foreground">{stmt.entry_count || 0} total</span></div></CardContent></Card>))}</div>
      )}
      <BankStatementUpload open={uploadOpen} onOpenChange={setUploadOpen} onUpload={async (file, bankName) => { await uploadStatement.mutateAsync({ file, bankName }); }} isUploading={uploadStatement.isPending} />
    </div>
  );
}