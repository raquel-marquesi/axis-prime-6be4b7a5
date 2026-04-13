import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DRELine { label: string; value: number; isTotal?: boolean; isSubtotal?: boolean; indent?: number; }

export function useDREReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['dre_report', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_financial_dre_summary', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      
      const dre = data as {
        receitaBruta: number;
        receitaRealizada: number;
        despesasTotal: number;
        despesasAdmin: number;
        despesasPessoal: number;
      };

      const receitaBruta = Number(dre.receitaBruta);
      const receitaRealizada = Number(dre.receitaRealizada);
      const despesasTotal = Number(dre.despesasTotal);
      const despesasAdmin = Number(dre.despesasAdmin);
      const despesasPessoal = Number(dre.despesasPessoal);
      
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
