import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, FileText, AlertTriangle, DollarSign } from 'lucide-react';

const FALLBACK_PRICE = 475.62;

interface ClientProjection {
  clientName: string;
  deadlineCount: number;
  avgPrice: number;
  projectedRevenue: number;
  source: 'contrato' | 'estimado';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function ProjecaoReceitaWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['projecao-receita'],
    queryFn: async () => {
      // 1. Get open deadlines with process info
      const { data: deadlines, error: dErr } = await supabase
        .from('process_deadlines')
        .select('id, process_id')
        .eq('is_completed', false);
      if (dErr) throw dErr;

      if (!deadlines?.length) return { projections: [] as ClientProjection[], totalGeneral: 0, totalContrato: 0, totalEstimado: 0, totalPrazos: 0 };

      // 2. Get unique process IDs and fetch processes with client ref
      const processIds = [...new Set(deadlines.map(d => d.process_id))];
      
      const allProcesses: { id: string; id_cliente: string }[] = [];
      for (let i = 0; i < processIds.length; i += 500) {
        const batch = processIds.slice(i, i + 500);
        const { data: processes, error: pErr } = await supabase
          .from('processes')
          .select('id, id_cliente')
          .in('id', batch);
        if (pErr) throw pErr;
        if (processes) allProcesses.push(...processes);
      }

      // 3. Get clients for names
      const clientIds = [...new Set(allProcesses.map(p => p.id_cliente).filter(Boolean))];
      const allClients: { id: string; nome: string | null; razao_social: string | null }[] = [];
      for (let i = 0; i < clientIds.length; i += 500) {
        const batch = clientIds.slice(i, i + 500);
        const { data: clients, error: cErr } = await supabase
          .from('clients')
          .select('id, nome, razao_social')
          .in('id', batch);
        if (cErr) throw cErr;
        if (clients) allClients.push(...clients);
      }
      const clientMap = new Map(allClients.map(c => [c.id, c.razao_social || c.nome || 'Sem Nome']));

      // 4. Get contract pricing
      const { data: pricing, error: prErr } = await supabase
        .from('contract_pricing')
        .select('client_id, cliente_nome, valor')
        .eq('is_active', true);
      if (prErr) throw prErr;

      const pricingByClientId = new Map<string, number[]>();
      const pricingByName = new Map<string, number[]>();
      for (const p of pricing || []) {
        if (p.valor && p.valor > 0) {
          if (p.client_id) {
            const arr = pricingByClientId.get(p.client_id) || [];
            arr.push(p.valor);
            pricingByClientId.set(p.client_id, arr);
          }
          const nameKey = p.cliente_nome.toUpperCase().trim();
          const arr2 = pricingByName.get(nameKey) || [];
          arr2.push(p.valor);
          pricingByName.set(nameKey, arr2);
        }
      }

      // 5. Map deadlines to clients
      const processMap = new Map(allProcesses.map(p => [p.id, p]));
      const clientDeadlines = new Map<string, { name: string; clientId: string | null; count: number }>();

      for (const d of deadlines) {
        const proc = processMap.get(d.process_id);
        const clientId = proc?.id_cliente || null;
        const clientName = clientId ? (clientMap.get(clientId) || 'Sem Nome') : 'Sem Cliente';
        const clientKey = clientName.toUpperCase().trim();
        const existing = clientDeadlines.get(clientKey) || { name: clientName, clientId, count: 0 };
        existing.count++;
        clientDeadlines.set(clientKey, existing);
      }

      // 5. Build projections
      const projections: ClientProjection[] = [];
      let totalContrato = 0;
      let totalEstimado = 0;

      for (const [, client] of clientDeadlines) {
        let avgPrice = FALLBACK_PRICE;
        let source: 'contrato' | 'estimado' = 'estimado';

        // Try by client_id first, then by name
        if (client.clientId && pricingByClientId.has(client.clientId)) {
          const vals = pricingByClientId.get(client.clientId)!;
          avgPrice = vals.reduce((a, b) => a + b, 0) / vals.length;
          source = 'contrato';
        } else {
          const nameKey = client.name.toUpperCase().trim();
          if (pricingByName.has(nameKey)) {
            const vals = pricingByName.get(nameKey)!;
            avgPrice = vals.reduce((a, b) => a + b, 0) / vals.length;
            source = 'contrato';
          }
        }

        const projectedRevenue = client.count * avgPrice;
        if (source === 'contrato') totalContrato += projectedRevenue;
        else totalEstimado += projectedRevenue;

        projections.push({
          clientName: client.name,
          deadlineCount: client.count,
          avgPrice,
          projectedRevenue,
          source,
        });
      }

      projections.sort((a, b) => b.projectedRevenue - a.projectedRevenue);

      return {
        projections,
        totalGeneral: totalContrato + totalEstimado,
        totalContrato,
        totalEstimado,
        totalPrazos: deadlines.length,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-64" /></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    );
  }

  const { projections = [], totalGeneral = 0, totalContrato = 0, totalEstimado = 0, totalPrazos = 0 } = data || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Projeção de Receita — Prazos em Aberto
        </CardTitle>
        <CardDescription>Estimativa de faturamento com base nos prazos processuais não concluídos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" /> Total Geral
            </div>
            <div className="text-xl font-bold text-primary">{formatCurrency(totalGeneral)}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="h-4 w-4" /> Com Contrato
            </div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(totalContrato)}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" /> Estimado (sem contrato)
            </div>
            <div className="text-xl font-bold text-yellow-600">{formatCurrency(totalEstimado)}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" /> Prazos em Aberto
            </div>
            <div className="text-xl font-bold">{totalPrazos.toLocaleString('pt-BR')}</div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Prazos</TableHead>
                <TableHead className="text-right">Preço Médio</TableHead>
                <TableHead className="text-right">Receita Projetada</TableHead>
                <TableHead>Fonte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projections.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.clientName}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.deadlineCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(p.avgPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(p.projectedRevenue)}</TableCell>
                  <TableCell>
                    <Badge variant={p.source === 'contrato' ? 'default' : 'secondary'} className={p.source === 'contrato' ? 'bg-green-600' : 'bg-yellow-500'}>
                      {p.source}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {projections.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum prazo em aberto encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
