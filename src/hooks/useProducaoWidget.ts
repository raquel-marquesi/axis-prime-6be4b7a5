import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export type ProducaoDimension = 'usuario' | 'cliente' | 'equipe' | 'atividade';
export interface ProducaoItem { label: string; pontos: number; lancamentos: number; percentual: number; }
export interface ProducaoData { items: ProducaoItem[]; totalPontos: number; totalLancamentos: number; }

export function useProducaoWidget() {
  const [month, setMonth] = useState(new Date());
  const [dimension, setDimension] = useState<ProducaoDimension>('usuario');
  const { user, isAdminOrManager, isCoordinatorOrAbove } = useAuth();
  const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
  const isAdmin = isAdminOrManager() || isCoordinatorOrAbove();

  const { data, isLoading } = useQuery({
    queryKey: ['producao-widget', monthStart, dimension, user?.id, isAdmin],
    queryFn: async (): Promise<ProducaoData> => {
      const { data: rows, error } = await supabase.rpc('get_producao_aggregated', { p_start: monthStart, p_end: monthEnd, p_dimension: dimension, p_user_id: user!.id, p_is_admin: isAdmin });
      if (error) throw error;
      if (!rows || rows.length === 0) return { items: [], totalPontos: 0, totalLancamentos: 0 };
      const totalPontos = rows.reduce((s: number, r: any) => s + Number(r.pontos), 0);
      const totalLancamentos = rows.reduce((s: number, r: any) => s + Number(r.lancamentos), 0);
      const items: ProducaoItem[] = rows.map((r: any) => ({ label: r.label || 'Desconhecido', pontos: Math.round(Number(r.pontos) * 100) / 100, lancamentos: Number(r.lancamentos), percentual: totalPontos > 0 ? Math.round((Number(r.pontos) / totalPontos) * 1000) / 10 : 0 }));
      return { items, totalPontos: Math.round(totalPontos * 100) / 100, totalLancamentos };
    },
    enabled: !!user,
  });

  return { data: data || { items: [], totalPontos: 0, totalLancamentos: 0 }, isLoading, month, setMonth, dimension, setDimension };
}
