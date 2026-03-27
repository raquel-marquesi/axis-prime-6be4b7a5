import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DRELine { label: string; value: number; isTotal?: boolean; isSubtotal?: boolean; indent?: number; }

export function useDREReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['dre_report', startDate, endDate],
    queryFn: async () => {
      const { data: invoices } = await supabase.from('invoices').select('valor, status').gte('data_emissao', startDate).lte('data_emissao', endDate);
      const { data: expenses } = await supabase.from('expenses').select('valor, status, categoria').gte('data_vencimento', startDate).lte('data_vencimento', endDate);

      const receitaBruta = (invoices || []).reduce((sum, i) => sum + Number(i.valor || 0), 0);
      const receitaRealizada = (invoices || []).filter(i => i.status === 'paga').reduce((sum, i) => sum + Number(i.valor || 0), 0);
      const allExpenses = expenses || [];
      const despesasPagas = allExpenses.filter(e => e.status === 'paga');
      const despesasTotal = despesasPagas.reduce((sum, e) => sum + Number(e.valor || 0), 0);
      const despesasAdmin = despesasPagas.filter(e => ['administrativa', 'aluguel', 'utilidades'].includes(e.categoria)).reduce((sum, e) => sum + Number(e.valor || 0), 0);
      const despesasPessoal = despesasPagas.filter(e => ['pessoal', 'salarios', 'beneficios'].includes(e.categoria)).reduce((sum, e) => sum + Number(e.valor || 0), 0);
      const despesasOperacionais = despesasTotal - despesasAdmin - despesasPessoal;
      const deducoes = receitaRealizada * 0.1133;
      const receitaLiquida = receitaRealizada - deducoes;
      const resultadoOperacional = receitaLiquida - despesasTotal;
      const margemLiquida = receitaRealizada > 0 ? (resultadoOperacional / receitaRealizada) * 100 : 0;

      const lines: DRELine[] = [
        { label: 'RECEITA BRUTA', value: receitaBruta, isTotal: true },
        { label: 'Receita Realizada (Paga)', value: receitaRealizada, indent: 1 },
        { label: 'Receita a Receber', value: receitaBruta - receitaRealizada, indent: 1 },
        { label: '(-) DEDUÇÕES DA RECEITA', value: -deducoes, isSubtotal: true },
        { label: 'Impostos sobre Receita', value: -deducoes, indent: 1 },
        { label: 'RECEITA LÍQUIDA', value: receitaLiquida, isTotal: true },
        { label: '(-) DESPESAS OPERACIONAIS', value: -despesasTotal, isSubtotal: true },
        { label: 'Despesas Administrativas', value: -despesasAdmin, indent: 1 },
        { label: 'Despesas com Pessoal', value: -despesasPessoal, indent: 1 },
        { label: 'Outras Despesas Operacionais', value: -despesasOperacionais, indent: 1 },
        { label: 'RESULTADO OPERACIONAL', value: resultadoOperacional, isTotal: true },
        { label: `MARGEM LÍQUIDA (${margemLiquida.toFixed(1)}%)`, value: resultadoOperacional, isTotal: true },
      ];

      return { lines, receitaBruta, receitaLiquida, despesasTotal, resultadoOperacional, margemLiquida };
    },
  });
}
