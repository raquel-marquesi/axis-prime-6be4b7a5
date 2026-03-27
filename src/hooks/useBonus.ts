import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useBonus() {
  const { user, isAdminOrManager, isCoordinatorOrAbove } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: myBonus = [], isLoading: isLoadingMyBonus } = useQuery({
    queryKey: ['bonus', 'my', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('bonus_calculations').select('*').eq('user_id', user!.id).order('reference_month', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: allBonus = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['bonus', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bonus_calculations').select('*').order('reference_month', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && (isAdminOrManager() || isCoordinatorOrAbove()),
  });

  const { data: areaGoals = [] } = useQuery({
    queryKey: ['area-goals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('area_goals').select('*').order('area');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const calculateBonus = useMutation({
    mutationFn: async (month: string) => {
      const { data, error } = await supabase.rpc('calculate_monthly_bonus', { p_month: month });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => { toast({ title: `${count} registros processados` }); queryClient.invalidateQueries({ queryKey: ['bonus'] }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  return { myBonus, allBonus, areaGoals, isLoadingMyBonus, isLoadingAll, calculateBonus };
}
