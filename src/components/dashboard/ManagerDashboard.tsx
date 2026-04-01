import { Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { InternalCalendarWidget } from '@/components/calendar/InternalCalendarWidget';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { useAuth } from '@/contexts/AuthContext';

export function ManagerDashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { session } = useAuth();
  const navigate = useNavigate();
  const userEmail = session?.user?.email || '';
  if (isLoading) { return (<div className="space-y-6"><div className="grid gap-4 md:grid-cols-2">{[1,2].map(i => (<Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>))}</div></div>); }
  const prazoStats = [
    { title: 'Prazos Pendentes', value: stats?.pendingDeadlines || 0, icon: Clock, description: 'Aguardando execução', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { title: 'Prazos Atrasados', value: stats?.overdueDeadlines || 0, icon: AlertTriangle, description: 'Requerem atenção', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">{prazoStats.map(stat => (<Card key={stat.title}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle><div className={`p-2 rounded-lg ${stat.bgColor}`}><stat.icon className={`h-4 w-4 ${stat.color}`} /></div></CardHeader><CardContent><div className="text-2xl font-bold">{stat.value}</div><p className="text-xs text-muted-foreground mt-1">{stat.description}</p></CardContent></Card>))}</div>
      <div className="grid gap-6 lg:grid-cols-2"><InternalCalendarWidget />{userEmail && <CalendarWidget userEmail={userEmail} />}</div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" />Contratos a Vencer</CardTitle><CardDescription>Próximos vencimentos</CardDescription></CardHeader>
        <CardContent><div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10"><span className="text-sm font-medium text-red-700">Próximos 30 dias</span><Badge variant="destructive">{stats?.contractsExpiring30 || 0}</Badge></div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10"><span className="text-sm font-medium text-yellow-700">Próximos 60 dias</span><Badge className="bg-yellow-500">{stats?.contractsExpiring60 || 0}</Badge></div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10"><span className="text-sm font-medium text-blue-700">Próximos 90 dias</span><Badge variant="secondary">{stats?.contractsExpiring90 || 0}</Badge></div>
        </div></CardContent>
      </Card>
    </div>
  );
}