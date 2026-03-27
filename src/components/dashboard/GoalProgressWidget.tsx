import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, TrendingUp, Users } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

function getProgressColor(percentage: number): string {
  if (percentage < 50) return '#ef4444';
  if (percentage < 80) return '#f59e0b';
  if (percentage < 100) return '#84cc16';
  return '#22c55e';
}

function getProgressLabel(percentage: number): string {
  if (percentage < 50) return 'Abaixo da meta';
  if (percentage < 80) return 'Em progresso';
  if (percentage < 100) return 'Quase lá';
  return 'Meta atingida!';
}

interface GoalData {
  userId: string;
  userName: string;
  area: string;
  totalWeighted: number;
  monthlyGoal: number;
  percentage: number;
}

function ProgressBar({ percentage, size = 'md' }: { percentage: number; size?: 'sm' | 'md' }) {
  const color = getProgressColor(percentage);
  const clampedWidth = Math.min(percentage, 120);
  const h = size === 'sm' ? 'h-2' : 'h-4';
  return (
    <div className={`relative w-full ${h} overflow-hidden rounded-full bg-secondary`}>
      <div className={`${h} rounded-full transition-all duration-500`} style={{ width: `${Math.min(clampedWidth, 100)}%`, backgroundColor: color }} />
      {percentage >= 100 && <div className={`absolute top-0 left-0 ${h} rounded-full opacity-30 animate-pulse`} style={{ width: '100%', backgroundColor: color }} />}
    </div>
  );
}

function useGoalProgress() {
  const { session, profile, isCoordinatorOrAbove, isAdminOrManager } = useAuth();
  const userId = session?.user?.id;
  const today = new Date();
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['goal-progress', userId, profile?.area],
    queryFn: async (): Promise<{ own: GoalData | null; team: GoalData[]; all: GoalData[] }> => {
      const result: { own: GoalData | null; team: GoalData[]; all: GoalData[] } = { own: null, team: [], all: [] };
      if (!userId) return result;

      const { data: areaGoals } = await supabase.from('area_goals').select('area, monthly_goal');
      const goalMap = new Map(areaGoals?.map(g => [g.area, g.monthly_goal]) || []);

      let targetUserIds: string[] = [];
      let profilesMap = new Map<string, { full_name: string; area: string | null }>();

      const GOAL_ROLES = ['calculista', 'lider', 'coordenador'];
      const { data: goalUserRoles } = await supabase.from('user_roles').select('user_id, role').in('role', GOAL_ROLES);
      const usersWithGoals = new Set(goalUserRoles?.map(r => r.user_id) || []);

      if (usersWithGoals.has(userId)) {
        targetUserIds.push(userId);
        profilesMap.set(userId, { full_name: profile?.full_name || 'Usuário', area: profile?.area || null });
      }

      let teamProfileIds: string[] = [];
      if (isCoordinatorOrAbove() && profile.id) {
        const { data: teamProfiles } = await supabase.from('profiles_safe' as any).select('user_id, full_name, area').eq('reports_to', profile.id).eq('is_active', true);
        if (teamProfiles) {
          for (const m of teamProfiles as any[]) {
            if (!usersWithGoals.has(m.user_id)) continue;
            targetUserIds.push(m.user_id);
            teamProfileIds.push(m.user_id);
            profilesMap.set(m.user_id, { full_name: m.full_name, area: m.area || profile.area });
          }
        }
      }

      if (isAdminOrManager()) {
        const { data: allProfiles } = await supabase.from('profiles_safe' as any).select('user_id, full_name, area').eq('is_active', true).not('area', 'is', null);
        if (allProfiles) {
          for (const m of allProfiles as any[]) {
            if (!usersWithGoals.has(m.user_id)) continue;
            if (!profilesMap.has(m.user_id)) targetUserIds.push(m.user_id);
            profilesMap.set(m.user_id, { full_name: m.full_name, area: m.area || 'execucao' as any });
          }
        }
      }

      const uniqueIds = [...new Set(targetUserIds)];
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_goal_progress_data', { p_month_start: monthStart, p_month_end: monthEnd, p_user_ids: uniqueIds });
      if (rpcError) throw rpcError;

      const weightedByUser = new Map<string, number>();
      for (const row of rpcData || []) weightedByUser.set(row.user_id, Number(row.total_weighted));

      function buildGoalData(uid: string): GoalData {
        const p = profilesMap.get(uid)!;
        const area = p.area || 'execucao';
        const memberGoal = goalMap.get(area as any) || 0;
        const memberWeighted = weightedByUser.get(uid) || 0;
        return { userId: uid, userName: p.full_name, area, totalWeighted: memberWeighted, monthlyGoal: memberGoal, percentage: memberGoal > 0 ? Math.round((memberWeighted / memberGoal) * 100) : 0 };
      }

      result.own = usersWithGoals.has(userId) ? buildGoalData(userId) : null;
      if (teamProfileIds.length > 0) result.team = teamProfileIds.filter(id => usersWithGoals.has(id)).map(buildGoalData).sort((a, b) => b.percentage - a.percentage);
      if (isAdminOrManager()) { const allUserIds = [...profilesMap.keys()].filter(id => usersWithGoals.has(id)); result.all = allUserIds.map(buildGoalData).sort((a, b) => b.percentage - a.percentage); }
      return result;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

const AREA_LABELS: Record<string, string> = {
  execucao: 'Execução', contingencia: 'Contingência', decisao: 'Decisão', acoes_coletivas: 'Ações Coletivas',
  agendamento: 'Agendamento', geral: 'Geral', civel: 'Cível', digitacao: 'Digitação', laudos: 'Laudos',
  financeiro_area: 'Financeiro', administrativo: 'Administrativo', rh: 'RH',
};

export function GoalProgressWidgetUser() {
  const { data, isLoading } = useGoalProgress();
  if (isLoading) return <Card><CardHeader className="pb-2"><Skeleton className="h-4 w-32" /></CardHeader><CardContent><Skeleton className="h-16 w-full" /></CardContent></Card>;
  const own = data?.own;
  if (!own || own.monthlyGoal === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Target className="h-5 w-5" style={{ color: getProgressColor(own.percentage) }} />Atingimento de Meta</CardTitle>
        <CardDescription>{AREA_LABELS[own.area] || own.area} — {format(new Date(), 'MMMM yyyy')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <div><span className="text-3xl font-bold" style={{ color: getProgressColor(own.percentage) }}>{own.percentage}%</span><p className="text-xs text-muted-foreground mt-1">{getProgressLabel(own.percentage)}</p></div>
          <div className="text-right text-sm text-muted-foreground"><p>{own.totalWeighted.toFixed(1)} / {own.monthlyGoal}</p><p className="text-xs">produção ponderada</p></div>
        </div>
        <ProgressBar percentage={own.percentage} />
      </CardContent>
    </Card>
  );
}

export function GoalProgressWidgetCoordinator() {
  const { data, isLoading } = useGoalProgress();
  if (isLoading) return <Card><CardHeader className="pb-2"><Skeleton className="h-4 w-40" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>;
  const own = data?.own;
  const team = data?.team || [];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5 text-primary" />Atingimento de Meta — Equipe</CardTitle>
        <CardDescription>{format(new Date(), 'MMMM yyyy')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {own && own.monthlyGoal > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="font-medium">Você ({own.percentage}%)</span><span className="text-muted-foreground">{own.totalWeighted.toFixed(1)} / {own.monthlyGoal}</span></div>
            <ProgressBar percentage={own.percentage} size="sm" />
          </div>
        )}
        {team.length > 0 ? (
          <div className="space-y-2">
            {team.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium shrink-0">{m.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between text-sm"><span className="font-medium truncate">{m.userName}</span><span className="font-bold text-xs" style={{ color: getProgressColor(m.percentage) }}>{m.percentage}%</span></div>
                  <ProgressBar percentage={m.percentage} size="sm" />
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro na equipe</p>}
      </CardContent>
    </Card>
  );
}

export function GoalProgressWidgetManager() {
  const { data, isLoading } = useGoalProgress();
  if (isLoading) return <Card><CardHeader className="pb-2"><Skeleton className="h-4 w-48" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>;
  const all = data?.all || [];
  const byArea = all.reduce<Record<string, GoalData[]>>((acc, d) => { (acc[d.area] = acc[d.area] || []).push(d); return acc; }, {});
  const areaAverages = Object.entries(byArea).map(([area, members]) => ({ area, avgPercentage: Math.round(members.reduce((s, m) => s + m.percentage, 0) / members.length), members })).sort((a, b) => b.avgPercentage - a.avgPercentage);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-5 w-5 text-primary" />Atingimento de Meta — Visão Global</CardTitle>
        <CardDescription>{format(new Date(), 'MMMM yyyy')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {areaAverages.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por Área</p>
            {areaAverages.map(({ area, avgPercentage }) => (
              <div key={area} className="space-y-1">
                <div className="flex items-center justify-between text-sm"><span className="font-medium">{AREA_LABELS[area] || area}</span><span className="font-bold" style={{ color: getProgressColor(avgPercentage) }}>{avgPercentage}%</span></div>
                <ProgressBar percentage={avgPercentage} size="sm" />
              </div>
            ))}
          </div>
        )}
        {all.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ranking</p>
            {all.slice(0, 10).map((m, i) => (
              <div key={m.userId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}º</span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between text-sm"><span className="font-medium truncate">{m.userName}</span><span className="font-bold text-xs" style={{ color: getProgressColor(m.percentage) }}>{m.percentage}%</span></div>
                  <ProgressBar percentage={m.percentage} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
        {all.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível</p>}
      </CardContent>
    </Card>
  );
}