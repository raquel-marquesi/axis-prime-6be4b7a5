import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface TimesheetEntry {
  id: string; user_id: string; process_id: string | null; activity_type_id: string | null;
  data_atividade: string; descricao: string; reclamante_nome: string | null;
  quantidade: number; created_at: string; updated_at: string;
  process?: any; activity_type?: any;
}

export interface TimesheetFormData {
  process_id: string; activity_type_id: string; data_atividade: string;
  descricao: string; reclamante_nome?: string | null; quantidade?: number;
}

export function useTimesheet(filters?: { startDate?: string; endDate?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['timesheet-entries', user?.id, filters?.startDate, filters?.endDate],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase.from('timesheet_entries')
        .select(`*, process:processes!process_id (id, numero_processo, numero_pasta, reclamante_nome, tipo_acao, drive_folder_id, client:clients!id_cliente (nome, razao_social)), activity_type:activity_types!activity_type_id (id, name, weight)`)
        .eq('user_id', user.id).order('data_atividade', { ascending: false });
      if (filters?.startDate) query = query.gte('data_atividade', filters.startDate);
      if (filters?.endDate) query = query.lte('data_atividade', filters.endDate);
      const { data, error } = await query;
      if (error) throw error;
      return data as TimesheetEntry[];
    },
    enabled: !!user?.id,
  });

  const createEntry = useMutation({
    mutationFn: async (formData: TimesheetFormData) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase.from('timesheet_entries').insert({ ...formData, user_id: user.id, quantidade: formData.quantidade || 1 }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] }); toast({ title: 'Atividade registrada' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('timesheet_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] }); toast({ title: 'Atividade removida' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  return { entries, isLoading, error, createEntry, deleteEntry };
}
