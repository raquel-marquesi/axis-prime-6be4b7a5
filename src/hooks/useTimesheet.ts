import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface TimesheetEntry {
  id: string; user_id: string; process_id: string | null; activity_type_id: string | null;
  data_atividade: string; descricao: string; reclamante_nome: string | null;
  quantidade: number; deadline_id?: string | null; created_at: string; updated_at: string;
  process?: any; activity_type?: any;
}

export interface TimesheetFormData {
  process_id: string; activity_type_id: string; data_atividade: string;
  descricao: string; reclamante_nome?: string | null; quantidade?: number; deadline_id?: string | null;
}

export function useTimesheet(filters?: { startDate?: string; endDate?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidateEntries = () => queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] });

  const ensureUserId = () => {
    if (!user?.id) throw new Error('Usuário não autenticado');
    return user.id;
  };

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
      const userId = ensureUserId();
      const { data, error } = await supabase
        .from('timesheet_entries')
        .insert({ ...formData, user_id: userId, quantidade: formData.quantidade ?? 1 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidateEntries(); toast({ title: 'Atividade registrada' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  const createBatchEntries = useMutation({
    mutationFn: async (entriesData: TimesheetFormData[]) => {
      const userId = ensureUserId();
      const payload = entriesData.map((entry) => ({
        ...entry,
        user_id: userId,
        quantidade: entry.quantidade ?? 1,
      }));

      const { data, error } = await supabase
        .from('timesheet_entries')
        .insert(payload)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      invalidateEntries();
      toast({
        title: variables.length === 1 ? 'Atividade registrada' : 'Atividades registradas',
        description: `${variables.length} lançamento(s) criado(s) com sucesso.`,
      });
    },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...formData }: TimesheetFormData & { id: string }) => {
      ensureUserId();
      const { data, error } = await supabase
        .from('timesheet_entries')
        .update({ ...formData, quantidade: formData.quantidade ?? 1 })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateEntries();
      toast({ title: 'Atividade atualizada' });
    },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('timesheet_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateEntries(); toast({ title: 'Atividade removida' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  const checkDuplicate = async (processId: string, activityTypeId: string, activityDate: string) => {
    const userId = ensureUserId();
    const { data, error } = await supabase
      .from('timesheet_entries')
      .select(`*, process:processes!process_id (id, numero_processo, numero_pasta, reclamante_nome, tipo_acao, drive_folder_id, client:clients!id_cliente (nome, razao_social)), activity_type:activity_types!activity_type_id (id, name, weight)`)
      .eq('user_id', userId)
      .eq('process_id', processId)
      .eq('activity_type_id', activityTypeId)
      .eq('data_atividade', activityDate)
      .limit(1);

    if (error) throw error;

    const existingEntry = (data?.[0] as TimesheetEntry | undefined) ?? undefined;
    return {
      isDuplicate: !!existingEntry,
      existingEntry,
    };
  };

  const checkBatchDuplicates = async (
    processId: string,
    activityTypeId: string,
    activityDate: string,
    reclamanteNomes: string[],
  ) => {
    const userId = ensureUserId();
    if (reclamanteNomes.length === 0) return [];

    const { data, error } = await supabase
      .from('timesheet_entries')
      .select('reclamante_nome')
      .eq('user_id', userId)
      .eq('process_id', processId)
      .eq('activity_type_id', activityTypeId)
      .eq('data_atividade', activityDate)
      .in('reclamante_nome', reclamanteNomes);

    if (error) throw error;

    return (data ?? [])
      .map((entry) => entry.reclamante_nome)
      .filter((name): name is string => !!name);
  };

  const approveEntries = useMutation({
    mutationFn: async (ids: string[]) => {
      const { user } = useAuth();
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('timesheet_entries')
        .update({ 
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .in('id', ids)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateEntries();
      queryClient.invalidateQueries({ queryKey: ['pending-timesheet-entries'] });
      toast({ title: 'Lançamentos aprovados' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao aprovar', description: error.message, variant: 'destructive' });
    },
  });

  return {
    entries,
    isLoading,
    error,
    createEntry,
    createBatchEntries,
    updateEntry,
    deleteEntry,
    checkDuplicate,
    checkBatchDuplicates,
    approveEntries,
  };
}

export function usePendingTimesheet(filters?: { client_id?: string; startDate?: string; endDate?: string }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-timesheet-entries', filters?.client_id, filters?.startDate, filters?.endDate],
    queryFn: async () => {
      let query = supabase.from('timesheet_entries')
        .select(`
          *,
          process:processes!process_id (
            id, 
            numero_processo, 
            numero_pasta, 
            reclamante_nome, 
            id_cliente,
            client:clients!id_cliente (id, nome, razao_social)
          ),
          activity_type:activity_types!activity_type_id (id, name, weight),
          user_profile:profiles!user_id (id, full_name, sigla)
        `)
        .is('approved_at', null)
        .order('data_atividade', { ascending: false });

      if (filters?.client_id) {
        // Since we filters by process.client_id
        // We use the alias 'client_id' defined in the join but better to use a filter on the junction
        query = query.filter('process.id_cliente', 'eq', filters.client_id);
      }
      if (filters?.startDate) query = query.gte('data_atividade', filters.startDate);
      if (filters?.endDate) query = query.lte('data_atividade', filters.endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}
