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
      const { data, error } = await supabase.rpc('get_revenue_projection');
      
      if (error) throw error;
      
      // A RPC `get_revenue_projection` retorna um JSON com exatamente as props necessárias
      return data as {
        projections: ClientProjection[];
        totalGeneral: number;
        totalContrato: number;
        totalEstimado: number;
        totalPrazos: number;
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
