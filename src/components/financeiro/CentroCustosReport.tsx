import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Download, ChevronDown, ChevronRight } from 'lucide-react';
import { useCentroCustosReport } from '@/hooks/useFinanceReports';
import { useBranches } from '@/hooks/useBranches';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function CentroCustosReport() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [branchId, setBranchId] = useState<string>('');
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const startDate = format(startOfMonth(new Date(month + '-01')), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(new Date(month + '-01')), 'yyyy-MM-dd');
  const { data: groups = [], isLoading } = useCentroCustosReport(startDate, endDate, branchId || undefined);
  const { branches } = useBranches();
  const totais = groups.reduce((acc, g) => ({ valorTotal: acc.valorTotal + g.valorTotal, emAberto: acc.emAberto + g.emAberto, vencido: acc.vencido + g.vencido, baixado: acc.baixado + g.baixado }), { valorTotal: 0, emAberto: 0, vencido: 0, baixado: 0 });
  const toggle = (cc: string) => { const next = new Set(openRows); next.has(cc) ? next.delete(cc) : next.add(cc); setOpenRows(next); };
  const exportCSV = () => { const header = 'Centro de Custo;Valor Total;Em Aberto;Vencido;Baixado\n'; const rows = groups.map(g => `${g.centroCusto};${g.valorTotal};${g.emAberto};${g.vencido};${g.baixado}`).join('\n'); const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `centro-custos-${month}.csv`; a.click(); };
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - i); return format(d, 'yyyy-MM'); });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={month} onValueChange={setMonth}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent>{months.map(m => (<SelectItem key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy', { locale: ptBR })}</SelectItem>))}</SelectContent></Select>
        <Select value={branchId || 'all'} onValueChange={v => setBranchId(v === 'all' ? '' : v)}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Todas as filiais" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as filiais</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Exportar</Button>
      </div>
      <Card><CardHeader><CardTitle className="text-lg">Análise por Centro de Custo</CardTitle></CardHeader><CardContent>
        {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : groups.length === 0 ? <p className="text-muted-foreground text-sm">Nenhum lançamento encontrado no período.</p> : (
          <Table><TableHeader><TableRow><TableHead className="w-8"></TableHead><TableHead>Centro de Custo</TableHead><TableHead className="text-right">Valor Total</TableHead><TableHead className="text-right">Em Aberto</TableHead><TableHead className="text-right">Vencido</TableHead><TableHead className="text-right">Baixado</TableHead></TableRow></TableHeader>
            <TableBody>{groups.map(g => (
              <Collapsible key={g.centroCusto} asChild open={openRows.has(g.centroCusto)}>
                <><CollapsibleTrigger asChild><TableRow className="cursor-pointer" onClick={() => toggle(g.centroCusto)}><TableCell>{openRows.has(g.centroCusto) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell><TableCell className="font-medium">{g.centroCusto}</TableCell><TableCell className="text-right">{fmt(g.valorTotal)}</TableCell><TableCell className="text-right">{fmt(g.emAberto)}</TableCell><TableCell className={`text-right ${g.vencido > 0 ? 'text-destructive font-semibold' : ''}`}>{fmt(g.vencido)}</TableCell><TableCell className="text-right">{fmt(g.baixado)}</TableCell></TableRow></CollapsibleTrigger>
                  <CollapsibleContent asChild><>{g.items.map((item: any, idx: number) => (<TableRow key={idx} className="bg-muted/30"><TableCell></TableCell><TableCell className="text-sm text-muted-foreground pl-8">{item.descricao || item.contato || '—'}<Badge variant="outline" className="ml-2 text-xs">{item.tipo}</Badge></TableCell><TableCell className="text-right text-sm">{fmt(item.valor || 0)}</TableCell><TableCell className="text-right text-sm">{item.data_vencimento}</TableCell><TableCell className="text-right text-sm">{item.status}</TableCell><TableCell></TableCell></TableRow>))}</></CollapsibleContent></>
              </Collapsible>
            ))}</TableBody>
            <TableFooter><TableRow><TableCell></TableCell><TableCell className="font-bold">Total Geral</TableCell><TableCell className="text-right font-bold">{fmt(totais.valorTotal)}</TableCell><TableCell className="text-right font-bold">{fmt(totais.emAberto)}</TableCell><TableCell className={`text-right font-bold ${totais.vencido > 0 ? 'text-destructive' : ''}`}>{fmt(totais.vencido)}</TableCell><TableCell className="text-right font-bold">{fmt(totais.baixado)}</TableCell></TableRow></TableFooter></Table>
        )}</CardContent></Card>
    </div>
  );
}