import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CustomRole {
  id: string;
  name: string;
  label: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export function useCustomRoles() {
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .order('is_system', { ascending: false })
        .order('label');
      if (error) throw error;
      return data as CustomRole[];
    },
  });

  const createRole = useMutation({
    mutationFn: async ({ name, label, description }: { name: string; label: string; description?: string }) => {
      const { error } = await supabase.from('custom_roles').insert({ name, label, description: description || null, is_system: false });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['custom-roles'] }); toast.success('Perfil criado com sucesso'); },
    onError: (error) => { toast.error(`Erro ao criar perfil: ${error.message}`); },
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['custom-roles'] }); toast.success('Perfil removido'); },
    onError: (error) => { toast.error(`Erro ao remover perfil: ${error.message}`); },
  });

  return { roles, isLoading, createRole, deleteRole };
}
