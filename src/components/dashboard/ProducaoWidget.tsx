import { useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useProducaoWidget, ProducaoDimension } from '@/hooks/useProducaoWidget';
import { subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DIMENSION_LABELS: Record<ProducaoDimension, string> = {
  usuario: 'Por Usuário',
  cliente: 'Por Cliente',
  equipe: 'Por Equipe',
  atividade: 'Por Atividade',
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.85)',
  'hsl(var(--primary) / 0.7)',
  'hsl(var(--primary) / 0.6)',
  'hsl(var(--primary) / 0.5)',
  'hsl(var(--primary) / 0.4)',
  'hsl(var(--primary) / 0.35)',
  'hsl(var(--primary) / 0.3)',
  'hsl(var(--primary) / 0.25)',
  'hsl(var(--primary) / 0.2)',
];

function getMonthOptions() {
  const now = new Date();
  const options = [];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    options.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy', { locale: ptBR }),
    });
  }
  return options;
}

export function ProducaoWidget() {
  const { data, isLoading, month, setMonth, dimension, setDimension } = useProducaoWidget();
  const monthOptions = getMonthOptions();

  const handleMonthChange = (value: string) => {
    const [year, m] = value.split('-').map(Number);
    setMonth(new Date(year, m - 1, 1));
  };

  const chartData = data.items.slice(0, 10).map(item => ({
    name: item.label.length > 20 ? item.label.slice(0, 18) + '…' : item.label,
    pontos: item.pontos,
    fullName: item.label,
  }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Análise de Produção
            </CardTitle>
            <CardDescription className="mt-1">
              {data.totalLancamentos} lançamentos · {data.totalPontos} pontos
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dimension} onValueChange={(v) => setDimension(v as ProducaoDimension)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DIMENSION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={format(month, 'yyyy-MM')} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[150px] h-8 text-xs capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="capitalize">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum dado de produção encontrado para este período
          </div>
        ) : (
          <>
            {chartData.length > 0 && (
              <div className="hidden sm:block">
                <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 32)}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={130}
                      tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value} pontos`,
                        props.payload.fullName,
                      ]}
                    />
                    <Bar dataKey="pontos" radius={[0, 4, 4, 0]} maxBarSize={24}>
                      {chartData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {data.items.map((item, index) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-6 text-right">
                      {index + 1}º
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{item.label}</span>
                        <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                          {item.pontos} pts · {item.lancamentos} lanç.
                        </span>
                      </div>
                      <Progress value={item.percentual} className="h-1.5" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}