import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityType {
  id: string;
  name: string;
  description: string | null;
  area: 'execucao' | 'contingencia' | 'decisao' | 'acoes_coletivas' | null;
  weight: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useActivityTypes(includeInactive = false) {
  const { data: activityTypes = [], isLoading, error } = useQuery({
    queryKey: ['activity-types', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('activity_types')
        .select('*')
        .order('name');
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActivityType[];
    },
  });

  return {
    activityTypes,
    isLoading,
    error,
  };
}
