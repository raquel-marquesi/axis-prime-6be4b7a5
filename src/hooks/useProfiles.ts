import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileBasic { user_id: string; full_name: string; email: string; }

export function useProfiles() {
  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles_safe' as any).select('user_id, full_name, email');
      if (error) throw error;
      return (data as unknown as ProfileBasic[]) ?? [];
    },
  });

  const getInitials = (userId: string | null): string => {
    if (!userId) return '—';
    const profile = profiles.find(p => p.user_id === userId);
    if (!profile) return '—';
    const parts = profile.full_name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const getName = (userId: string | null): string => {
    if (!userId) return 'Desconhecido';
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.full_name || 'Desconhecido';
  };

  return { profiles, isLoading, error, getInitials, getName };
}
