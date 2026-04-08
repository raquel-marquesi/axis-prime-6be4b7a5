import { useState } from 'react';
import {
  Calendar,
  LayoutDashboard,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuth } from '@/contexts/AuthContext';
import { AREA_LABELS } from '@/types/auth';
import InternalCalendarWidget from '@/components/calendar/InternalCalendarWidget';
import InternalFullCalendar from '@/components/calendar/InternalFullCalendar';
import EventFormDialog from '@/components/calendar/EventFormDialog';
import { BonusGaugeWidget } from '@/components/dashboard/BonusGaugeWidget';
import { ProducaoWidget } from '@/components/dashboard/ProducaoWidget';
import { GoalProgressWidgetCoordinator } from '@/components/dashboard/GoalProgressWidget';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { PrazosAtrasadosWidget } from '@/components/dashboard/PrazosAtrasadosWidget';
import { RecebiveisWidget } from '@/components/financeiro/RecebiveisWidget';
import { AgendaFaturamentoWidget } from '@/components/financeiro/AgendaFaturamentoWidget';
import { RentabilidadeChart } from '@/components/financeiro/RentabilidadeChart';
import { PremiacaoVsFaturamentoChart } from '@/components/financeiro/PremiacaoVsFaturamentoChart';
import { ProjecaoReceitaWidget } from '@/components/financeiro/ProjecaoReceitaWidget';

import { useDashboardStats } from '@/hooks/useDashboardStats';
import { getAvailableWidgets, getDefaultWidgetIds } from '@/lib/dashboardWidgets';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format } from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';

export default function Dashboard() {
  const { profile, session, roles } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [calendarKey, setCalendarKey] = useState(0);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email || '';

  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  

  // Determine active widgets
  const config = (profile as any)?.dashboard_config as { widgets?: string[] } | null;
  const activeWidgets: string[] = config?.widgets ?? getDefaultWidgetIds(roles);
  const availableSet = new Set(getAvailableWidgets(roles).map(w => w.id));
  const enabledWidgets = new Set(activeWidgets.filter(id => availableSet.has(id)));

  const handleEventCreated = () => setCalendarKey((prev) => prev + 1);
  const handleEventClick = (event: CalendarEvent) => { setSelectedEvent(event); setCreateEventOpen(true); };
  const handleNewEvent = () => { setSelectedEvent(null); setCreateEventOpen(true); };

  const has = (id: string) => enabledWidgets.has(id);

  const renderWidgets = () => {
    if (enabledWidgets.size === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum widget habilitado. Vá em <strong>Configurações → Dashboard</strong> para personalizar sua visão.
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* KPI row */}
        {(has('deadlines_pending') || has('deadlines_overdue') || has('clientes_ativos')) && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {has('deadlines_pending') && (
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/solicitacoes')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Prazos Pendentes</CardTitle>
                  <div className="p-2 rounded-lg bg-orange-500/10"><Clock className="h-4 w-4 text-orange-500" /></div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.pendingDeadlines ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Próximos 7 dias</p>
                </CardContent>
              </Card>
            )}
            {has('deadlines_overdue') && (
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/solicitacoes')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Prazos Atrasados</CardTitle>
                  <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.overdueDeadlines ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Requerem atenção</p>
                </CardContent>
              </Card>
            )}
            {has('clientes_ativos') && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Ativos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.activeClients ?? 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total de clientes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Contratos a Vencer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.contractsExpiring30 ?? 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Próximos 30 dias</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Recebiveis */}
        {has('recebiveis') && <RecebiveisWidget />}

        {/* Goal / Producao */}
        {has('goal_progress') && <GoalProgressWidgetCoordinator />}
        {has('producao') && <ProducaoWidget />}

        {/* Two-column widgets */}
        {(has('calendar') || has('bonus') || has('deadlines_by_member')) && (
          <div className="grid gap-6 md:grid-cols-2">
            {has('calendar') && (
              <InternalCalendarWidget
                key={`calendar-${calendarKey}`}
                onEventClick={handleEventClick}
              />
            )}
            {has('bonus') && <BonusGaugeWidget />}
            {has('deadlines_by_member') && stats?.deadlinesByUser && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Prazos por Membro</CardTitle>
                  <CardDescription>Status de prazos de cada membro</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.deadlinesByUser.map(member => (
                      <div key={member.user_name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-sm font-medium">{member.user_name}</span>
                        <div className="flex gap-2">
                          {member.overdue > 0 && <Badge variant="destructive" className="text-xs">{member.overdue} atrasado{member.overdue > 1 ? 's' : ''}</Badge>}
                          {member.pending > 0 && <Badge variant="secondary" className="text-xs">{member.pending} pendente{member.pending > 1 ? 's' : ''}</Badge>}
                          {member.pending === 0 && member.overdue === 0 && <Badge variant="outline" className="text-xs text-green-600">Em dia</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Google Calendar */}
        {has('google_calendar') && userEmail && <CalendarWidget userEmail={userEmail} />}

        {/* Contracts expiring */}
        {has('contracts_expiring') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Contratos a Vencer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10"><span className="text-sm font-medium text-red-700">Próximos 30 dias</span><Badge variant="destructive">{stats?.contractsExpiring30 || 0}</Badge></div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10"><span className="text-sm font-medium text-yellow-700">Próximos 60 dias</span><Badge className="bg-yellow-500">{stats?.contractsExpiring60 || 0}</Badge></div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10"><span className="text-sm font-medium text-blue-700">Próximos 90 dias</span><Badge variant="secondary">{stats?.contractsExpiring90 || 0}</Badge></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Finance charts */}
        {(has('rentabilidade') || has('premiacao_faturamento')) && (
          <div className="grid gap-6 lg:grid-cols-2">
            {has('rentabilidade') && <RentabilidadeChart />}
            {has('premiacao_faturamento') && <PremiacaoVsFaturamentoChart />}
          </div>
        )}

        {has('projecao_receita') && <ProjecaoReceitaWidget />}
        {has('agenda_faturamento') && <AgendaFaturamentoWidget />}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {profile?.area ? `Área: ${AREA_LABELS[profile.area]}` : 'Bem-vindo ao Marquesi Consultoria'}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendário
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {renderWidgets()}
          </TabsContent>

          <TabsContent value="calendar">
            <InternalFullCalendar
              key={`full-calendar-${calendarKey}`}
              onAddEvent={handleNewEvent}
              onEventClick={handleEventClick}
            />
          </TabsContent>
        </Tabs>
      </div>

      <EventFormDialog
        open={createEventOpen}
        onOpenChange={setCreateEventOpen}
        event={selectedEvent}
        onEventSaved={handleEventCreated}
      />
    </>
  );
}
