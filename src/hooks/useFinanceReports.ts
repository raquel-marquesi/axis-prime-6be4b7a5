import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, differenceInDays, parseISO, addMonths } from 'date-fns';

export function useCentroCustosReport(startDate: string, endDate: string, branchId?: string) {
  return useQuery({
    queryKey: ['finance-centro-custos', startDate, endDate, branchId],
    queryFn: async () => {
      let expQ = supabase.from('expenses').select('id, descricao, fornecedor, valor, data_vencimento, data_pagamento, status, centro_custo, categoria').gte('data_vencimento', startDate).lte('data_vencimento', endDate);
      if (branchId) expQ = expQ.eq('branch_id', branchId);
      const { data: expenses, error: e1 } = await expQ;
      if (e1) throw e1;
      let invQ = supabase.from('invoices').select('id, descricao, valor, data_vencimento, data_emissao, status, billing_contacts(razao_social, centro_custo), accounts(nome)').gte('data_vencimento', startDate).lte('data_vencimento', endDate);
      if (branchId) invQ = invQ.eq('branch_id', branchId);
      const { data: invoices, error: e2 } = await invQ;
      if (e2) throw e2;

      const groups: Record<string, { centroCusto: string; valorTotal: number; emAberto: number; vencido: number; baixado: number; items: any[] }> = {};
      const today = new Date().toISOString().split('T')[0];
      for (const exp of (expenses || [])) { const cc = (exp as any).centro_custo || 'Sem centro de custo'; if (!groups[cc]) groups[cc] = { centroCusto: cc, valorTotal: 0, emAberto: 0, vencido: 0, baixado: 0, items: [] }; groups[cc].valorTotal += exp.valor || 0; if (exp.status === 'paga') groups[cc].baixado += exp.valor || 0; else if (exp.data_vencimento < today && exp.status === 'pendente') groups[cc].vencido += exp.valor || 0; else groups[cc].emAberto += exp.valor || 0; groups[cc].items.push({ ...exp, tipo: 'despesa' }); }
      for (const inv of (invoices || [])) { const bc = inv.billing_contacts as any; const cc = bc?.centro_custo || 'Sem centro de custo'; if (!groups[cc]) groups[cc] = { centroCusto: cc, valorTotal: 0, emAberto: 0, vencido: 0, baixado: 0, items: [] }; groups[cc].valorTotal += inv.valor || 0; if (inv.status === 'paga') groups[cc].baixado += inv.valor || 0; else if (inv.data_vencimento && inv.data_vencimento < today && inv.status !== 'paga' && inv.status !== 'cancelada') groups[cc].vencido += inv.valor || 0; else groups[cc].emAberto += inv.valor || 0; groups[cc].items.push({ ...inv, tipo: 'receita', conta: (inv.accounts as any)?.nome, contato: bc?.razao_social }); }
      return Object.values(groups).sort((a, b) => b.valorTotal - a.valorTotal);
    },
  });
}

export function useContasPagarReport(startDate: string, endDate: string, categoria?: string, status?: string, branchId?: string) {
  return useQuery({
    queryKey: ['finance-contas-pagar', startDate, endDate, categoria, status, branchId],
    queryFn: async () => {
      let q = supabase.from('expenses').select('*').gte('data_vencimento', startDate).lte('data_vencimento', endDate).order('data_vencimento', { ascending: true });
      if (categoria && categoria !== 'todas') q = q.eq('categoria', categoria);
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      const today = new Date().toISOString().split('T')[0];
      const expenses = (data || []).map(e => ({ ...e, diasAtraso: e.status === 'pendente' && e.data_vencimento < today ? differenceInDays(new Date(), parseISO(e.data_vencimento)) : 0, statusCalculado: e.status === 'pendente' && e.data_vencimento < today ? 'atrasada' : e.status }));
      const filtered = status && status !== 'todas' ? expenses.filter(e => e.statusCalculado === status) : expenses;
      const resumo = { totalPagar: expenses.filter(e => e.statusCalculado === 'pendente').reduce((s, e) => s + e.valor, 0), atrasadas: expenses.filter(e => e.statusCalculado === 'atrasada').reduce((s, e) => s + e.valor, 0), atrasadasCount: expenses.filter(e => e.statusCalculado === 'atrasada').length, pagas: expenses.filter(e => e.status === 'paga').reduce((s, e) => s + e.valor, 0), pagasCount: expenses.filter(e => e.status === 'paga').length, canceladas: expenses.filter(e => e.status === 'cancelada').reduce((s, e) => s + e.valor, 0) };
      const byMonth: Record<string, { pago: number; aberto: number }> = {};
      for (const e of expenses) { const month = e.data_vencimento.substring(0, 7); if (!byMonth[month]) byMonth[month] = { pago: 0, aberto: 0 }; if (e.status === 'paga') byMonth[month].pago += e.valor; else byMonth[month].aberto += e.valor; }
      const chartData = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }));
      return { expenses: filtered, resumo, chartData };
    },
  });
}

export function useContasReceberReport(startDate: string, endDate: string, accountId?: string, branchId?: string) {
  return useQuery({
    queryKey: ['finance-contas-receber', startDate, endDate, accountId, branchId],
    queryFn: async () => {
      let q = supabase.from('invoices').select('*, accounts(nome), billing_contacts(razao_social, centro_custo)').order('data_vencimento', { ascending: true });
      if (accountId) q = q.eq('account_id', accountId);
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      const today = new Date(); const todayStr = format(today, 'yyyy-MM-dd');
      const all = (data || []).map(inv => { const dias = inv.data_vencimento && inv.status !== 'paga' && inv.status !== 'cancelada' && inv.data_vencimento < todayStr ? differenceInDays(today, parseISO(inv.data_vencimento)) : 0; return { ...inv, diasAtraso: dias, conta: (inv.accounts as any)?.nome, contato: (inv.billing_contacts as any)?.razao_social }; });
      const inPeriod = all.filter(i => i.data_vencimento && i.data_vencimento >= startDate && i.data_vencimento <= endDate);
      const futureItems = all.filter(i => i.data_vencimento && i.data_vencimento > endDate && i.status !== 'paga' && i.status !== 'cancelada');
      const resumo = { totalReceber: inPeriod.filter(i => i.status !== 'paga' && i.status !== 'cancelada').reduce((s, i) => s + (i.valor || 0), 0), atrasados: inPeriod.filter(i => i.diasAtraso > 0).reduce((s, i) => s + (i.valor || 0), 0), atrasadosCount: inPeriod.filter(i => i.diasAtraso > 0).length, recebidos: inPeriod.filter(i => i.status === 'paga').reduce((s, i) => s + (i.valor || 0), 0), recebidosCount: inPeriod.filter(i => i.status === 'paga').length, futuros: futureItems.reduce((s, i) => s + (i.valor || 0), 0), futurosCount: futureItems.length };
      const overdue = inPeriod.filter(i => i.diasAtraso > 0);
      const aging = [{ faixa: '1-7 dias', min: 1, max: 7 }, { faixa: '8-15 dias', min: 8, max: 15 }, { faixa: '16-30 dias', min: 16, max: 30 }, { faixa: '31-60 dias', min: 31, max: 60 }, { faixa: '60+ dias', min: 61, max: 99999 }].map(({ faixa, min, max }) => { const items = overdue.filter(i => i.diasAtraso >= min && i.diasAtraso <= max); return { faixa, quantidade: items.length, valor: items.reduce((s, i) => s + (i.valor || 0), 0) }; });
      return { invoices: inPeriod.sort((a, b) => b.diasAtraso - a.diasAtraso), resumo, aging };
    },
  });
}

export function useFluxoCaixaReport(startDate: string, endDate: string, branchIds?: string[]) {
  return useQuery({
    queryKey: ['finance-fluxo-caixa', startDate, endDate, branchIds],
    queryFn: async () => {
      let expQ = supabase.from('expenses').select('valor, data_pagamento, data_vencimento, status, branch_id').eq('status', 'paga');
      if (branchIds && branchIds.length > 0) expQ = expQ.in('branch_id', branchIds);
      const { data: expenses, error: e1 } = await expQ;
      if (e1) throw e1;
      let invQ = supabase.from('invoices').select('valor, data_vencimento, status, branch_id').eq('status', 'paga');
      if (branchIds && branchIds.length > 0) invQ = invQ.in('branch_id', branchIds);
      const { data: invoices, error: e2 } = await invQ;
      if (e2) throw e2;
      const months: Record<string, { recebimentos: number; pagamentos: number }> = {};
      let current = startOfMonth(parseISO(startDate)); const end = endOfMonth(parseISO(endDate));
      while (current <= end) { months[format(current, 'yyyy-MM')] = { recebimentos: 0, pagamentos: 0 }; current = addMonths(current, 1); }
      for (const exp of (expenses || [])) { const dt = exp.data_pagamento || exp.data_vencimento; if (!dt) continue; const month = dt.substring(0, 7); if (months[month] !== undefined) months[month].pagamentos += exp.valor || 0; }
      for (const inv of (invoices || [])) { const dt = inv.data_vencimento; if (!dt) continue; const month = dt.substring(0, 7); if (months[month] !== undefined) months[month].recebimentos += inv.valor || 0; }
      let saldoAcumulado = 0;
      const data = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => { saldoAcumulado += v.recebimentos - v.pagamentos; return { month, ...v, saldo: saldoAcumulado }; });
      const totais = { recebimentos: data.reduce((s, d) => s + d.recebimentos, 0), pagamentos: data.reduce((s, d) => s + d.pagamentos, 0), saldo: saldoAcumulado };
      return { data, totais };
    },
  });
}

export function useFaturamentoClienteReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['finance-fat-cliente', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('id, valor, status, data_vencimento, account_id, accounts(nome)').gte('data_vencimento', startDate).lte('data_vencimento', endDate);
      if (error) throw error;
      const today = new Date().toISOString().split('T')[0];
      const groups: Record<string, { accountId: string; accountName: string; total: number; emitidas: number; pagas: number; emAtraso: number; count: number }> = {};
      for (const inv of (data || [])) { const aid = inv.account_id; const name = (inv.accounts as any)?.nome || 'Sem conta'; if (!groups[aid]) groups[aid] = { accountId: aid, accountName: name, total: 0, emitidas: 0, pagas: 0, emAtraso: 0, count: 0 }; const v = inv.valor || 0; groups[aid].total += v; groups[aid].count++; if (inv.status === 'paga') groups[aid].pagas += v; else if (inv.data_vencimento && inv.data_vencimento < today && inv.status !== 'cancelada') groups[aid].emAtraso += v; else if (inv.status === 'emitida') groups[aid].emitidas += v; }
      return Object.values(groups).sort((a, b) => b.total - a.total);
    },
  });
}

export function useFaturamentoProfissionalReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['finance-fat-profissional', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('id, valor, created_by, data_vencimento').gte('data_vencimento', startDate).lte('data_vencimento', endDate).not('created_by', 'is', null);
      if (error) throw error;
      const userIds = [...new Set((data || []).map(i => i.created_by).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles' as any).select('user_id, full_name').in('user_id', userIds as string[]);
      const profileMap: Record<string, string> = {};
      for (const p of ((profiles as any[]) || [])) profileMap[p.user_id] = p.full_name;
      const groups: Record<string, { userId: string; name: string; total: number; count: number; average: number }> = {};
      for (const inv of (data || [])) { const uid = inv.created_by!; if (!groups[uid]) groups[uid] = { userId: uid, name: profileMap[uid] || 'Desconhecido', total: 0, count: 0, average: 0 }; groups[uid].total += inv.valor || 0; groups[uid].count++; }
      return Object.values(groups).map(g => ({ ...g, average: g.count > 0 ? g.total / g.count : 0 })).sort((a, b) => b.total - a.total);
    },
  });
}

export function useTesourariaReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['finance-tesouraria-report', startDate, endDate],
    queryFn: async () => {
      const { data: bankAccounts, error: e1 } = await supabase.from('bank_accounts_config').select('*').eq('is_active', true);
      if (e1) throw e1;
      const { data: entries, error: e2 } = await supabase.from('treasury_entries').select('*').gte('data_movimentacao', startDate).lte('data_movimentacao', endDate);
      if (e2) throw e2;
      const accounts = (bankAccounts || []).map(ba => { const acEntries = (entries || []).filter(e => e.bank_account_id === ba.id); const entradas = acEntries.filter(e => e.tipo === 'entrada').reduce((s, e) => s + Number(e.valor), 0); const saidas = acEntries.filter(e => e.tipo === 'saida' || e.tipo === 'transferencia').reduce((s, e) => s + Number(e.valor), 0); return { ...ba, entradas, saidas, saldo: entradas - saidas }; });
      const monthly: Record<string, { entradas: number; saidas: number }> = {};
      for (const e of (entries || [])) { const month = e.data_movimentacao.substring(0, 7); if (!monthly[month]) monthly[month] = { entradas: 0, saidas: 0 }; if (e.tipo === 'entrada') monthly[month].entradas += Number(e.valor); else monthly[month].saidas += Number(e.valor); }
      const monthlyData = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }));
      return { accounts, monthlyData };
    },
  });
}
