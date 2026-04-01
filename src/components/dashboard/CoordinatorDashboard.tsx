import { Users, Clock, AlertTriangle, CheckCircle2, Calendar, TrendingUp, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { InternalCalendarWidget } from '@/components/calendar/InternalCalendarWidget';
import { ProducaoWidget } from '@/components/dashboard/ProducaoWidget';
import { useAuth } from '@/contexts/AuthContext';
import { GoalProgressWidgetCoordinator } from '@/components/dashboard/GoalProgressWidget';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';

export function CoordinatorDashboard() {
  const { profile, session } = useAuth();
  const userEmail = session?.user?.email || '';
  const { data: stats, isLoading } = useDashboardStats();
  const navigate = useNavigate();
  if (isLoading) {
    return (<div className="space-y-6"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map(i => (<Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>))}</div></div>);
  }
  const teamStats = [
    { title: 'Membros da Equipe', value: stats?.teamMembers || 0, icon: Users, description: 'Pessoas sob coordenação', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { title: 'Prazos Pendentes', value: stats?.teamPendingDeadlines || 0, icon: Clock, description: 'Da equipe', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { title: 'Prazos Atrasados', value: stats?.teamOverdueDeadlines || 0, icon: AlertTriangle, description: 'Atenção necessária', color: 'text-red-500', bgColor: 'bg-red-500/10' },
    { title: 'Atividades do Mês', value: stats?.teamMonthlyActivities || 0, icon: CheckCircle2, description: 'Produção da equipe', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  ];
  return (
    <div className="space-y-6">
      <GoalProgressWidgetCoordinator />
      <ProducaoWidget />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {teamStats.map(stat => {
          const isDeadline = stat.title.includes('Prazo');
          return (<Card key={stat.title} className={isDeadline ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} onClick={isDeadline ? () => navigate('/solicitacoes') : undefined}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle><div className={`p-2 rounded-lg ${stat.bgColor}`}><stat.icon className={`h-4 w-4 ${stat.color}`} /></div></CardHeader><CardContent><div className="text-2xl font-bold">{stat.value}</div><p className="text-xs text-muted-foreground mt-1">{stat.description}</p></CardContent></Card>);
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Prazos por Membro</CardTitle><CardDescription>Status de prazos de cada membro da equipe</CardDescription></CardHeader>
          <CardContent>{stats?.deadlinesByUser && stats.deadlinesByUser.length > 0 ? (<div className="space-y-3">{stats.deadlinesByUser.map(member => (<div key={member.user_name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">{member.user_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div><span className="font-medium text-sm">{member.user_name}</span></div><div className="flex items-center gap-2">{member.overdue > 0 && <Badge variant="destructive" className="text-xs">{member.overdue} atrasado{member.overdue > 1 ? 's' : ''}</Badge>}{member.pending > 0 && <Badge variant="secondary" className="text-xs">{member.pending} pendente{member.pending > 1 ? 's' : ''}</Badge>}{member.pending === 0 && member.overdue === 0 && <Badge variant="outline" className="text-xs text-green-600">Em dia</Badge>}</div></div>))}</div>) : (<div className="text-center py-8 text-muted-foreground text-sm">Nenhum membro na equipe</div>)}</CardContent>
        </Card>
        <InternalCalendarWidget />
      </div>
      {userEmail && <div className="grid gap-6 lg:grid-cols-1"><CalendarWidget userEmail={userEmail} /></div>}
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-500" />Ações Rápidas</CardTitle><CardDescription>Gerenciamento da equipe</CardDescription></CardHeader>
        <CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => navigate('/')} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent transition-colors"><Calendar className="h-6 w-6 text-muted-foreground" /><span className="text-sm font-medium">Ver Agenda</span></button>
          <button onClick={() => navigate('/solicitacoes')} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent transition-colors"><Clock className="h-6 w-6 text-muted-foreground" /><button onClick={() => navigate('/solicitacoes')} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent transition-colors"><Clock className="h-6 w-6 text-muted-foreground" /><span className="text-sm font-medium">Prazos</span></button></button>
          <button onClick={() => navigate('/premiacao')} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent transition-colors"><Trophy className="h-6 w-6 text-muted-foreground" /><span className="text-sm font-medium">Premiação</span></button>
          <button onClick={() => navigate('/relatorios')} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent transition-colors"><TrendingUp className="h-6 w-6 text-muted-foreground" /><span className="text-sm font-medium">Relatórios</span></button>
        </div></CardContent>
      </Card>
    </div>
  );
}