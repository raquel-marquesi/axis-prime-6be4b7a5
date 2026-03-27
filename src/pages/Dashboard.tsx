import { useState } from 'react';
import {
  Calendar,
  LayoutDashboard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { AREA_LABELS } from '@/types/auth';
import InternalCalendarWidget from '@/components/calendar/InternalCalendarWidget';
import InternalFullCalendar from '@/components/calendar/InternalFullCalendar';
import EventFormDialog from '@/components/calendar/EventFormDialog';
import CoordinatorDashboard from '@/components/dashboard/CoordinatorDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import FinanceDashboard from '@/components/dashboard/FinanceDashboard';
import BonusGaugeWidget from '@/components/dashboard/BonusGaugeWidget';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format } from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';

export default function Dashboard() {
  const { profile, session, isAdminOrManager, isCoordinatorOrAbove, isFinanceiro } = useAuth();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [calendarKey, setCalendarKey] = useState(0);

  const userId = session?.user?.id;

  const { data: pendingDeadlinesCount } = useQuery({
    queryKey: ['dashboard-pending-deadlines', userId],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const in7days = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      const { count } = await supabase
        .from('process_deadlines')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userId!)
        .eq('is_completed', false)
        .gte('data_prazo', today)
        .lte('data_prazo', in7days);
      return count || 0;
    },
    enabled: !!userId,
  });

  const handleEventCreated = () => {
    setCalendarKey((prev) => prev + 1);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setCreateEventOpen(true);
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setCreateEventOpen(true);
  };

  const renderRoleBasedDashboard = () => {
    if (isFinanceiro()) return <FinanceDashboard />;
    if (isAdminOrManager()) return <ManagerDashboard />;
    if (isCoordinatorOrAbove()) return <CoordinatorDashboard />;
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prazos Pendentes
            </CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Calendar className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDeadlinesCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Próximos 7 dias</p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <InternalCalendarWidget
            key={`calendar-${calendarKey}`}
            onEventClick={handleEventClick}
          />
          <BonusGaugeWidget />
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
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
            {renderRoleBasedDashboard()}
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
    </MainLayout>
  );
}