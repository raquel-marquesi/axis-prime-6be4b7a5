import { useState } from 'react';
import { useBoletos } from '@/hooks/useBoletos';
import { BoletoForm } from './BoletoForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Send, CheckCircle, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = { generated: { label: 'Gerado', variant: 'outline' }, sent: { label: 'Enviado', variant: 'default' }, paid: { label: 'Pago', variant: 'secondary' }, cancelled: { label: 'Cancelado', variant: 'destructive' } };

export function BoletosTab() {
  const { boletos, isLoading, stats, createBoleto, updateStatus } = useBoletos();
  const [formOpen, setFormOpen] = useState(false);
  const statCards = [{ title: 'Total', value: stats.total }, { title: 'Gerados', value: stats.generated }, { title: 'Enviados', value: stats.sent }, { title: 'Pagos', value: stats.paid }];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Boletos</h2><Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-2" /> Gerar Boleto</Button></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{statCards.map(c => (<Card key={c.title}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{c.title}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{c.value}</p></CardContent></Card>))}</div>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Contato</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead><TableHead>Nosso Número</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
        <TableBody>{isLoading ? (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>) : boletos.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum boleto</TableCell></TableRow>) : boletos.map(b => { const sc = statusConfig[b.status] || statusConfig.generated; return (
          <TableRow key={b.id}><TableCell>{b.billing_contacts?.razao_social || '-'}</TableCell><TableCell>{fmt(b.amount)}</TableCell><TableCell>{format(parseISO(b.due_date), 'dd/MM/yyyy')}</TableCell><TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell><TableCell>{b.our_number || '-'}</TableCell>
            <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{b.status === 'generated' && (<DropdownMenuItem onClick={() => updateStatus.mutate({ id: b.id, status: 'sent', sent_at: new Date().toISOString() })}><Send className="h-4 w-4 mr-2" /> Marcar Enviado</DropdownMenuItem>)}{(b.status === 'generated' || b.status === 'sent') && (<DropdownMenuItem onClick={() => updateStatus.mutate({ id: b.id, status: 'paid', paid_at: new Date().toISOString() })}><CheckCircle className="h-4 w-4 mr-2" /> Marcar Pago</DropdownMenuItem>)}{b.status !== 'cancelled' && b.status !== 'paid' && (<DropdownMenuItem onClick={() => updateStatus.mutate({ id: b.id, status: 'cancelled' })}><XCircle className="h-4 w-4 mr-2" /> Cancelar</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></TableCell></TableRow>); })}</TableBody></Table></CardContent></Card>
      <BoletoForm open={formOpen} onOpenChange={setFormOpen} onSubmit={(data) => createBoleto.mutate(data)} />
    </div>
  );
}