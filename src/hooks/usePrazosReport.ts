import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, format } from 'date-fns';

export function usePrazosAbertosReport() {
  return useQuery({
    queryKey: ['prazos-abertos-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('process_deadlines')
        .select('id, occurrence, deadline_date, is_completed, completed_at, assigned_to, process_id, source')
        .eq('is_completed', false)
        .order('deadline_date', { ascending: true });
      if (error) throw error;

      const processIds = [...new Set((data || []).map(d => d.process_id).filter(Boolean))];
      const userIds = [...new Set((data || []).map(d => d.assigned_to).filter(Boolean))];

      const [processesRes, profilesRes] = await Promise.all([
        processIds.length > 0
          ? supabase.from('processes').select('id, numero_processo, client_id').in('id', processIds)
          : { data: [], error: null },
        userIds.length > 0
          ? supabase.from('profiles' as any).select('user_id, full_name').in('user_id', userIds as string[])
          : { data: [], error: null },
      ]);

      const processMap: Record<string, any> = {};
      for (const p of (processesRes.data || [])) processMap[p.id] = p;

      const clientIds = [...new Set(Object.values(processMap).map((p: any) => p.client_id).filter(Boolean))];
      const clientsRes = clientIds.length > 0
        ? await supabase.from('clients').select('id, razao_social, nome').in('id', clientIds)
        : { data: [] };
      const clientMap: Record<string, string> = {};
      for (const c of (clientsRes.data || [])) clientMap[c.id] = c.razao_social || c.nome || '—';

      const profileMap: Record<string, string> = {};
      for (const p of ((profilesRes.data as any[]) || [])) profileMap[p.user_id] = p.full_name;

      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      return (data || []).map(d => {
        const proc = processMap[d.process_id] || {};
        const diasAtraso = d.deadline_date && d.deadline_date < todayStr ? differenceInDays(today, parseISO(d.deadline_date)) : 0;
        const statusPrazo = d.deadline_date === todayStr ? 'Hoje' : diasAtraso > 0 ? 'Atrasado' : 'Futuro';
        return {
          id: d.id,
          processo: proc.numero_processo || '—',
          cliente: clientMap[proc.client_id] || '—',
          ocorrencia: d.occurrence || '—',
          data_prazo: d.deadline_date,
          responsavel: profileMap[d.assigned_to!] || 'Não atribuído',
          status_prazo: statusPrazo,
          dias_atraso: diasAtraso,
          source: d.source || '—',
        };
      });
    },
  });
}

export function usePrazosPorProfissionalReport() {
  return useQuery({
    queryKey: ['prazos-por-profissional-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('process_deadlines')
        .select('id, is_completed, deadline_date, assigned_to')
        .not('assigned_to', 'is', null);
      if (error) throw error;

      const userIds = [...new Set((data || []).map(d => d.assigned_to).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles' as any).select('user_id, full_name').in('user_id', userIds as string[]);
      const profileMap: Record<string, string> = {};
      for (const p of ((profiles as any[]) || [])) profileMap[p.user_id] = p.full_name;

      const today = format(new Date(), 'yyyy-MM-dd');
      const groups: Record<string, { name: string; total: number; concluidos: number; abertos: number; atrasados: number }> = {};

      for (const d of (data || [])) {
        const uid = d.assigned_to!;
        if (!groups[uid]) groups[uid] = { name: profileMap[uid] || 'Desconhecido', total: 0, concluidos: 0, abertos: 0, atrasados: 0 };
        groups[uid].total++;
        if (d.is_completed) { groups[uid].concluidos++; }
        else {
          groups[uid].abertos++;
          if (d.deadline_date && d.deadline_date < today) groups[uid].atrasados++;
        }
      }

      return Object.values(groups)
        .map(g => ({ ...g, taxa_conclusao: g.total > 0 ? Math.round((g.concluidos / g.total) * 100) : 0 }))
        .sort((a, b) => b.total - a.total);
    },
  });
}

export function usePrazosPorEquipeReport() {
  return useQuery({
    queryKey: ['prazos-por-equipe-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('process_deadlines')
        .select('id, is_completed, deadline_date, assigned_to')
        .not('assigned_to', 'is', null);
      if (error) throw error;

      const userIds = [...new Set((data || []).map(d => d.assigned_to).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles' as any).select('user_id, full_name, reports_to').in('user_id', userIds as string[]);
      const profileMap: Record<string, any> = {};
      for (const p of ((profiles as any[]) || [])) profileMap[p.user_id] = p;

      const leaderIds = [...new Set(Object.values(profileMap).map((p: any) => p.reports_to).filter(Boolean))];
      const { data: leaders } = leaderIds.length > 0
        ? await supabase.from('profiles' as any).select('id, full_name').in('id', leaderIds as string[])
        : { data: [] };
      const leaderMap: Record<string, string> = {};
      for (const l of ((leaders as any[]) || [])) leaderMap[l.id] = l.full_name;

      const today = format(new Date(), 'yyyy-MM-dd');
      const groups: Record<string, { equipe: string; total: number; concluidos: number; abertos: number; atrasados: number }> = {};

      for (const d of (data || [])) {
        const prof = profileMap[d.assigned_to!];
        const leaderId = prof?.reports_to || 'sem_equipe';
        const equipeName = leaderMap[leaderId] || 'Sem equipe';
        if (!groups[leaderId]) groups[leaderId] = { equipe: equipeName, total: 0, concluidos: 0, abertos: 0, atrasados: 0 };
        groups[leaderId].total++;
        if (d.is_completed) { groups[leaderId].concluidos++; }
        else {
          groups[leaderId].abertos++;
          if (d.deadline_date && d.deadline_date < today) groups[leaderId].atrasados++;
        }
      }

      return Object.values(groups).sort((a, b) => b.total - a.total);
    },
  });
}

export function usePrazosPorClienteReport() {
  return useQuery({
    queryKey: ['prazos-por-cliente-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('process_deadlines')
        .select('id, is_completed, deadline_date, process_id');
      if (error) throw error;

      const processIds = [...new Set((data || []).map(d => d.process_id).filter(Boolean))];
      const { data: processes } = processIds.length > 0
        ? await supabase.from('processes').select('id, client_id').in('id', processIds)
        : { data: [] };
      const procClientMap: Record<string, string> = {};
      for (const p of (processes || [])) if (p.client_id) procClientMap[p.id] = p.client_id;

      const clientIds = [...new Set(Object.values(procClientMap))];
      const { data: clients } = clientIds.length > 0
        ? await supabase.from('clients').select('id, razao_social, nome').in('id', clientIds)
        : { data: [] };
      const clientMap: Record<string, string> = {};
      for (const c of (clients || [])) clientMap[c.id] = c.razao_social || c.nome || '—';

      const today = format(new Date(), 'yyyy-MM-dd');
      const groups: Record<string, { cliente: string; total: number; concluidos: number; abertos: number; atrasados: number }> = {};

      for (const d of (data || [])) {
        const clientId = procClientMap[d.process_id] || 'sem_cliente';
        const clienteName = clientMap[clientId] || 'Sem cliente';
        if (!groups[clientId]) groups[clientId] = { cliente: clienteName, total: 0, concluidos: 0, abertos: 0, atrasados: 0 };
        groups[clientId].total++;
        if (d.is_completed) { groups[clientId].concluidos++; }
        else {
          groups[clientId].abertos++;
          if (d.deadline_date && d.deadline_date < today) groups[clientId].atrasados++;
        }
      }

      return Object.values(groups).sort((a, b) => b.total - a.total);
    },
  });
}
