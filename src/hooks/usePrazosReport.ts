import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, format } from 'date-fns';

export function usePrazosAbertosReport() {
  return useQuery({
    queryKey: ['prazos-abertos-report'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_prazos_abertos_report' as any);
      if (error) throw error;

      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      return ((data as any[]) || []).map((d: any) => {
        const diasAtraso = d.data_prazo && d.data_prazo < todayStr ? differenceInDays(today, parseISO(d.data_prazo)) : 0;
        const statusPrazo = d.data_prazo === todayStr ? 'Hoje' : diasAtraso > 0 ? 'Atrasado' : 'Futuro';
        return {
          id: d.id,
          processo: d.processo || '—',
          numero_pasta: d.numero_pasta || '—',
          reclamante: d.reclamante || '—',
          reclamadas: d.reclamadas || '—',
          area: d.area || '—',
          cliente: d.cliente || '—',
          ocorrencia: d.ocorrencia || '—',
          data_prazo: d.data_prazo,
          responsavel: d.responsavel || 'Não atribuído',
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
        .select('id, is_completed, data_prazo, assigned_to')
        .not('assigned_to', 'is', null)
        .range(0, 4999);
      if (error) throw error;

      const userIds = [...new Set((data || []).map(d => d.assigned_to).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles_safe' as any).select('user_id, full_name').in('user_id', userIds as string[]);
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
          if (d.data_prazo && d.data_prazo < today) groups[uid].atrasados++;
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
        .select('id, is_completed, data_prazo, assigned_to')
        .not('assigned_to', 'is', null)
        .range(0, 4999);
      if (error) throw error;

      const userIds = [...new Set((data || []).map(d => d.assigned_to).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles_safe' as any).select('user_id, full_name, reports_to').in('user_id', userIds as string[]);
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
          if (d.data_prazo && d.data_prazo < today) groups[leaderId].atrasados++;
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
        .select('id, is_completed, data_prazo, process_id')
        .range(0, 4999);
      if (error) throw error;

      const processIds = [...new Set((data || []).map(d => d.process_id).filter(Boolean))];
      const { data: processes } = processIds.length > 0
        ? await supabase.from('processes').select('id, id_cliente').in('id', processIds)
        : { data: [] };
      const procClientMap: Record<string, string> = {};
      for (const p of (processes || [])) if ((p as any).id_cliente) procClientMap[p.id] = (p as any).id_cliente;

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
          if (d.data_prazo && d.data_prazo < today) groups[clientId].atrasados++;
        }
      }

      return Object.values(groups).sort((a, b) => b.total - a.total);
    },
  });
}
