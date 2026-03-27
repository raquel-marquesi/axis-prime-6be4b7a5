import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppRole, UserProfile } from '@/types/auth';

export interface UserWithRoles extends UserProfile { roles: AppRole[]; coordinator?: UserProfile | null; }

export function useUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').order('full_name');
      if (profilesError) throw profilesError;
      const { data: allRoles, error: rolesError } = await supabase.from('user_roles').select('*');
      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile: any) => {
        const userRoles = allRoles?.filter((r) => r.user_id === profile.user_id) || [];
        return { ...profile, roles: userRoles.map((r) => r.role as AppRole), coordinator: null };
      });
      return usersWithRoles;
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, newRole, oldRoles }: { userId: string; newRole: AppRole; oldRoles: AppRole[] }) => {
      if (oldRoles.length > 0) {
        const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
        if (error) throw error;
      }
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Perfil atualizado' }); },
    onError: (error) => { toast({ variant: 'destructive', title: 'Erro', description: error.message }); },
  });

  const inviteUser = useMutation({
    mutationFn: async (data: { email: string; fullName: string; role: string; coordinatorId?: string; area?: string }) => {
      const { data: responseData, error } = await supabase.functions.invoke('invite-user', { body: data });
      if (error) throw error;
      if (responseData?.error) throw new Error(responseData.error);
      return responseData;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Convite enviado' }); },
    onError: (error) => { toast({ variant: 'destructive', title: 'Erro', description: error.message }); },
  });

  const deleteUser = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { data, error } = await supabase.functions.invoke('delete-user', { body: { userId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Usuário excluído' }); },
    onError: (error) => { toast({ variant: 'destructive', title: 'Erro', description: error.message }); },
  });

  return { users, isLoading, error, updateUserRole, inviteUser, deleteUser };
}
