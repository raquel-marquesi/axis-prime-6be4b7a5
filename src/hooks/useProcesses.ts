import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TipoAcao = 'individual' | 'coletiva';
export type AreaProcesso = 'trabalhista' | 'civel';

export interface Process {
  id: string;
  area: AreaProcesso;
  tipo_acao: TipoAcao;
  numero_processo: string;
  numero_pasta: number;
  codigo_externo: string | null;
  id_cliente: string;
  reclamante_nome: string;
  reclamante_nascimento: string | null;
  reclamante_cpf: string | null;
  reclamadas: string[];
  drive_folder_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  client?: { id: string; nome: string | null; razao_social: string | null; tipo: 'fisica' | 'juridica'; };
}

export interface ProcessFormData {
  area: AreaProcesso;
  tipo_acao: TipoAcao;
  numero_processo: string;
  codigo_externo?: string | null;
  id_cliente: string;
  reclamante_nome: string;
  reclamante_nascimento?: string | null;
  reclamante_cpf?: string | null;
  reclamadas?: string[];
}

export function useProcesses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: processes = [], isLoading, error } = useQuery({
    queryKey: ['processes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processes')
        .select(`*, client:clients!id_cliente (id, nome, razao_social, tipo)`)
        .order('numero_pasta', { ascending: false });
      if (error) throw error;
      return data as Process[];
    },
  });

  const createProcess = useMutation({
    mutationFn: async (formData: ProcessFormData) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('processes').insert({ ...formData, created_by: user.user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['processes'] }); toast({ title: 'Processo criado' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao criar processo', description: error.message, variant: 'destructive' }); },
  });

  const createProcessesBatch = useMutation({
    mutationFn: async (processesList: ProcessFormData[]) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('processes').insert(processesList.map(p => ({ ...p, created_by: user.user?.id }))).select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['processes'] }); toast({ title: `${data.length} processo(s) importados` }); },
    onError: (error: Error) => { toast({ title: 'Erro ao importar', description: error.message, variant: 'destructive' }); },
  });

  const updateProcess = useMutation({
    mutationFn: async ({ id, ...formData }: ProcessFormData & { id: string }) => {
      const { data, error } = await supabase.from('processes').update(formData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['processes'] }); toast({ title: 'Processo atualizado' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }); },
  });

  const deleteProcess = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('processes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['processes'] }); toast({ title: 'Processo excluído' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); },
  });

  return { processes, isLoading, error, createProcess, createProcessesBatch, updateProcess, deleteProcess };
}
