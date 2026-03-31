import { Users, Building2, AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { RecebiveisWidget } from '@/components/financeiro/RecebiveisWidget';
import { AgendaFaturamentoWidget } from '@/components/financeiro/AgendaFaturamentoWidget';
import { RentabilidadeChart } from '@/components/financeiro/RentabilidadeChart';
import { PremiacaoVsFaturamentoChart } from '@/components/financeiro/PremiacaoVsFaturamentoChart';
import { ProjecaoReceitaWidget } from '@/components/financeiro/ProjecaoReceitaWidget';

export function FinanceDashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  if (isLoading) { return (<div className="space-y-6"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map(i => (<Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>))}</div></div>); }
  const financeStats = [
    { title: 'Clientes Ativos', value: stats?.activeClients || 0, icon: Users, description: 'Total de clientes', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { title: 'Pessoa Física', value: stats?.clientsByType.fisica || 0, icon: Users, description: 'Clientes PF', color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { title: 'Pessoa Jurídica', value: stats?.clientsByType.juridica || 0, icon: Building2, description: 'Clientes PJ', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { title: 'Contratos a Vencer', value: stats?.contractsExpiring30 || 0, icon: AlertTriangle, description: 'Próximos 30 dias', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  ];
  return (
    <div className="space-y-6">
      <RecebiveisWidget />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{financeStats.map(stat => (<Card key={stat.title}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle><div className={`p-2 rounded-lg ${stat.bgColor}`}><stat.icon className={`h-4 w-4 ${stat.color}`} /></div></CardHeader><CardContent><div className="text-2xl font-bold">{stat.value}</div><p className="text-xs text-muted-foreground mt-1">{stat.description}</p></CardContent></Card>))}</div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Vencimento de Contratos</CardTitle><CardDescription>Contratos que vencem em breve</CardDescription></CardHeader>
          <CardContent><div className="space-y-4">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-200"><div className="flex items-center justify-between mb-2"><span className="text-sm font-semibold text-red-700">Urgente - 30 dias</span><Badge variant="destructive" className="text-lg px-3 py-1">{stats?.contractsExpiring30 || 0}</Badge></div><p className="text-xs text-red-600">Contratos que expiram nos próximos 30 dias</p></div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-200"><div className="flex items-center justify-between mb-2"><span className="text-sm font-semibold text-yellow-700">Atenção - 60 dias</span><Badge className="bg-yellow-500 text-lg px-3 py-1">{stats?.contractsExpiring60 || 0}</Badge></div><p className="text-xs text-yellow-600">Contratos que expiram nos próximos 60 dias</p></div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-200"><div className="flex items-center justify-between mb-2"><span className="text-sm font-semibold text-blue-700">Planejamento - 90 dias</span><Badge variant="secondary" className="text-lg px-3 py-1">{stats?.contractsExpiring90 || 0}</Badge></div><p className="text-xs text-blue-600">Contratos que expiram nos próximos 90 dias</p></div>
          </div></CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Distribuição de Clientes</CardTitle><CardDescription>Por tipo de pessoa</CardDescription></CardHeader>
          <CardContent><div className="space-y-6">
            <div className="flex items-center gap-4"><div className="flex-1"><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">Pessoa Física</span><span className="text-sm text-muted-foreground">{stats?.clientsByType.fisica || 0} clientes</span></div><div className="h-3 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${stats?.activeClients ? ((stats.clientsByType.fisica || 0) / stats.activeClients * 100) : 0}%` }} /></div></div></div>
            <div className="flex items-center gap-4"><div className="flex-1"><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">Pessoa Jurídica</span><span className="text-sm text-muted-foreground">{stats?.clientsByType.juridica || 0} clientes</span></div><div className="h-3 bg-muted rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${stats?.activeClients ? ((stats.clientsByType.juridica || 0) / stats.activeClients * 100) : 0}%` }} /></div></div></div>
            <div className="pt-4 border-t"><div className="flex items-center justify-between"><span className="font-semibold">Total de Clientes Ativos</span><span className="text-2xl font-bold text-primary">{stats?.activeClients || 0}</span></div></div>
          </div></CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2"><RentabilidadeChart /><PremiacaoVsFaturamentoChart /></div>
      <AgendaFaturamentoWidget />
    </div>
  );
}