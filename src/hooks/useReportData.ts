import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

export interface ProdutividadeRow { user_id: string; full_name: string; area: string | null; total_weighted: number; monthly_goal: number; percentage: number; bonus_projected: number; }
export interface ProdutividadeFilters { month: Date; area: string | null; collaboratorId: string | null; clientId: string | null; coordinatorId: string | null; }

export function useProdutividadeReport(filters: ProdutividadeFilters) {
  const { user, isAdminOrManager, isCoordinatorOrAbove } = useAuth();
  const { month, area: areaFilter, collaboratorId, clientId, coordinatorId } = filters;
  return useQuery({
    queryKey: ['report-produtividade', format(month, 'yyyy-MM'), areaFilter, collaboratorId, clientId, coordinatorId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_produtividade_report', {
        p_month: format(month, 'yyyy-MM-dd'),
        p_area: areaFilter || null,
        p_collaborator_id: collaboratorId || null,
        p_client_id: clientId || null,
        p_coordinator_id: coordinatorId || null,
        p_user_id: user?.id || null
      });

      if (error) {
        console.error('Error fetching produtividade data from RPC:', error);
        throw error;
      }

      const payload = data as any;
      return {
        rows: payload.rows || [],
        history: payload.history || []
      };
    },
  });
}

export interface PrazoRow { id: string; processo: string; ocorrencia: string; data_prazo: string; status: 'cumprido' | 'atrasado' | 'pendente'; responsavel: string; responsavel_id: string | null; dias_atraso: number; view_category: 'atrasado' | 'hoje' | 'futuro' | 'concluido'; }
export interface PrazosSummary { total: number; cumpridos: number; atrasados: number; pendentes: number; taxa: number; }

export function usePrazosReportSummary(month: Date, responsavelFilter: string | null) {
  return useQuery({
    queryKey: ['report-prazos-summary', format(month, 'yyyy-MM'), responsavelFilter],
    queryFn: async () => { const monthDate = format(startOfMonth(month), 'yyyy-MM-dd'); const { data, error } = await supabase.rpc('get_prazos_summary', { p_month: monthDate, p_responsavel_id: responsavelFilter || undefined }); if (error) throw error; const result = data as any; return { summary: result.summary as PrazosSummary, monthlyChart: (result.monthlyChart || []) as { month: string; cumpridos: number; atrasados: number }[], ranking: (result.ranking || []) as { name: string; total: number; cumpridos: number; taxa: number }[] }; },
  });
}

export function usePrazosReportRows(month: Date, responsavelFilter: string | null, statusFilters: string[], page: number, pageSize: number = 50) {
  return useQuery({
    queryKey: ['report-prazos-rows', format(month, 'yyyy-MM'), responsavelFilter, statusFilters, page, pageSize],
    queryFn: async () => { const monthDate = format(startOfMonth(month), 'yyyy-MM-dd'); const { data, error } = await supabase.rpc('get_prazos_rows', { p_month: monthDate, p_responsavel_id: responsavelFilter || undefined, p_status_filters: statusFilters.length > 0 ? statusFilters : [], p_page: page, p_page_size: pageSize }); if (error) throw error; const result = data as any; return { rows: (result.rows || []) as PrazoRow[], total: result.total as number, page: result.page as number, pageSize: result.page_size as number, totalPages: result.total_pages as number }; },
  });
}

export function usePrazosReport(month: Date, responsavelFilter: string | null, statusFilters: string[]) {
  return useQuery({
    queryKey: ['report-prazos-combined', format(month, 'yyyy-MM'), responsavelFilter, statusFilters],
    queryFn: async () => { const monthDate = format(startOfMonth(month), 'yyyy-MM-dd'); const [summaryRes, rowsRes] = await Promise.all([supabase.rpc('get_prazos_summary', { p_month: monthDate, p_responsavel_id: responsavelFilter || undefined }), supabase.rpc('get_prazos_rows', { p_month: monthDate, p_responsavel_id: responsavelFilter || undefined, p_status_filters: statusFilters.length > 0 ? statusFilters : [], p_page: 1, p_page_size: 50 })]); if (summaryRes.error) throw summaryRes.error; if (rowsRes.error) throw rowsRes.error; const summary = summaryRes.data as any; const rows = rowsRes.data as any; return { rows: (rows.rows || []) as PrazoRow[], summary: summary.summary as PrazosSummary, monthlyChart: (summary.monthlyChart || []) as { month: string; cumpridos: number; atrasados: number }[], ranking: (summary.ranking || []) as { name: string; total: number; cumpridos: number; taxa: number }[], pagination: { total: rows.total as number, page: rows.page as number, pageSize: rows.page_size as number, totalPages: rows.total_pages as number } }; },
  });
}

export function useCarteiraReport(areaFilter: string | null, clienteFilter: string | null, tipoAcaoFilter: string | null) {
  return useQuery({
    queryKey: ['report-carteira', areaFilter, clienteFilter, tipoAcaoFilter],
    queryFn: async () => {
      let query = supabase.from('processes').select('id, area, tipo_acao, id_cliente, created_at, numero_processo, reclamante_nome');
      if (areaFilter) query = query.eq('area', areaFilter as any);
      if (tipoAcaoFilter) query = query.eq('tipo_acao', tipoAcaoFilter as any);
      if (clienteFilter) query = query.eq('id_cliente', clienteFilter);
      const { data: processes } = await query;
      const { data: clients } = await supabase.from('clients').select('id, nome, razao_social, tipo');
      const clientMap = new Map(clients?.map(c => [c.id, c]) ?? []);
      const total = processes?.length ?? 0;
      const byArea = { trabalhista: 0, civel: 0 }; const byTipo = { individual: 0, coletiva: 0 };
      processes?.forEach(p => { if (p.area in byArea) byArea[p.area as keyof typeof byArea]++; if (p.tipo_acao in byTipo) byTipo[p.tipo_acao as keyof typeof byTipo]++; });
      const now = new Date(); const monthlyNew: { month: string; count: number }[] = [];
      for (let i = 5; i >= 0; i--) { const m = subMonths(now, i); const mStart = startOfMonth(m); const mEnd = endOfMonth(m); const count = processes?.filter(p => { const d = new Date(p.created_at); return d >= mStart && d <= mEnd; }).length ?? 0; monthlyNew.push({ month: format(m, 'MMM/yy'), count }); }
      const thirtyDaysAgo = format(subMonths(now, 1), 'yyyy-MM-dd'); const processIds = processes?.map(p => p.id) ?? [];
      const { data: recentEntries } = await supabase.from('timesheet_entries').select('process_id').gte('data_atividade', thirtyDaysAgo).in('process_id', processIds.slice(0, 100));
      const activeProcessIds = new Set(recentEntries?.map(e => e.process_id) ?? []);
      const inactive = processes?.filter(p => !activeProcessIds.has(p.id)).map(p => ({ id: p.id, numero: p.numero_processo, reclamante: p.reclamante_nome, cliente: clientMap.get(p.id_cliente)?.nome ?? clientMap.get(p.id_cliente)?.razao_social ?? '—', area: p.area })) ?? [];
      const clientCount = new Map<string, number>(); processes?.forEach(p => { clientCount.set(p.id_cliente, (clientCount.get(p.id_cliente) ?? 0) + 1); });
      const top10 = Array.from(clientCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, count]) => { const c = clientMap.get(id); return { name: c?.nome ?? c?.razao_social ?? '—', count }; });
      return { summary: { total, byArea, byTipo }, areaChart: [{ name: 'Trabalhista', value: byArea.trabalhista }, { name: 'Cível', value: byArea.civel }], monthlyNew, inactive: inactive.slice(0, 50), top10 };
    },
  });
}

export function useFinanceiroReport(month: Date, tipoClienteFilter: string | null) {
  return useQuery({
    queryKey: ['report-financeiro', format(month, 'yyyy-MM'), tipoClienteFilter],
    queryFn: async () => {
      let clientsQuery = supabase.from('clients').select('id, nome, razao_social, tipo, contrato_data_inicio, contrato_data_vencimento, is_active');
      if (tipoClienteFilter) clientsQuery = clientsQuery.eq('tipo', tipoClienteFilter as any);
      const { data: clients } = await clientsQuery;
      const today = new Date(); const activeClients = clients?.filter(c => c.is_active) ?? [];
      const expiringContracts = activeClients.filter(c => c.contrato_data_vencimento).map(c => { const vencimento = new Date(c.contrato_data_vencimento!); const diasRestantes = differenceInDays(vencimento, today); return { id: c.id, nome: c.nome ?? c.razao_social ?? '—', tipo: c.tipo, data_inicio: c.contrato_data_inicio, data_vencimento: c.contrato_data_vencimento, dias_restantes: diasRestantes }; }).filter(c => c.dias_restantes >= 0 && c.dias_restantes <= 90).sort((a, b) => a.dias_restantes - b.dias_restantes);
      const em30 = expiringContracts.filter(c => c.dias_restantes <= 30).length; const em60 = expiringContracts.filter(c => c.dias_restantes <= 60).length; const em90 = expiringContracts.length;
      const pf = activeClients.filter(c => c.tipo === 'fisica').length; const pj = activeClients.filter(c => c.tipo === 'juridica').length;
      const monthlyBilling: { month: string; total: number }[] = [];
      for (let i = 5; i >= 0; i--) { const m = subMonths(month, i); const mStart = format(startOfMonth(m), 'yyyy-MM-dd'); const mEnd = format(endOfMonth(m), 'yyyy-MM-dd'); const { data: invoices } = await supabase.from('invoices').select('valor').gte('data_emissao', mStart).lte('data_emissao', mEnd).eq('status', 'emitida'); const total = invoices?.reduce((s, inv) => s + (inv.valor ?? 0), 0) ?? 0; monthlyBilling.push({ month: format(m, 'MMM/yy'), total }); }
      return { summary: { em30, em60, em90, pf, pj, totalAtivos: activeClients.length }, expiringContracts, monthlyBilling, clientTypeChart: [{ name: 'Pessoa Física', value: pf }, { name: 'Pessoa Jurídica', value: pj }] };
    },
  });
}
