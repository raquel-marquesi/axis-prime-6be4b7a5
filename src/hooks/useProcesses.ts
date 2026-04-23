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

export function useProcesses(options?: { page?: number; pageSize?: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['processes', options?.page, options?.pageSize],
    queryFn: async () => {
      let query = supabase
        .from('processes')
        .select(`*, client:clients!id_cliente (id, nome, razao_social, tipo)`, { count: 'exact' })
        .order('numero_pasta', { ascending: false });

      if (options?.page !== undefined && options?.pageSize !== undefined) {
        const from = options.page * options.pageSize;
        const to = from + options.pageSize - 1;
        query = query.range(from, to);
      } else {
        query = query.limit(2000);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { processes: data as Process[], count: count || 0 };
    },
  });

  const processes = data?.processes || [];
  const totalCount = data?.count || 0;

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
      // 1. Normalizar entrada (trim + remover vazios)
      const normalized = processesList
        .map(p => ({ ...p, numero_processo: p.numero_processo?.trim() ?? '' }))
        .filter(p => p.numero_processo.length > 0);

      if (normalized.length === 0) {
        return { inserted: 0, skipped: 0, errors: 0, insertedRows: [] as any[] };
      }

      // 2. Pre-check em batch: quais já existem no banco?
      const uniqueNumeros = Array.from(new Set(normalized.map(p => p.numero_processo)));
      const { data: existing, error: checkError } = await supabase
        .from('processes')
        .select('numero_processo')
        .in('numero_processo', uniqueNumeros);
      if (checkError) throw checkError;

      const existingSet = new Set((existing ?? []).map(r => r.numero_processo));

      // 3. Particionar + dedupe interno (linhas duplicadas no mesmo arquivo)
      const seen = new Set<string>();
      const toInsert = normalized.filter(p => {
        if (existingSet.has(p.numero_processo)) return false;
        if (seen.has(p.numero_processo)) return false;
        seen.add(p.numero_processo);
        return true;
      });
      const skipped = normalized.length - toInsert.length;

      if (toInsert.length === 0) {
        return { inserted: 0, skipped, errors: 0, insertedRows: [] as any[] };
      }

      // 4. Inserir somente os novos
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('processes')
        .insert(toInsert.map(p => ({ ...p, created_by: user.user?.id })))
        .select();

      if (error) {
        return {
          inserted: 0,
          skipped,
          errors: toInsert.length,
          insertedRows: [] as any[],
          errorMessage: error.message,
        };
      }

      return { inserted: data.length, skipped, errors: 0, insertedRows: data };
    },
    onSuccess: ({ inserted, skipped, errors, errorMessage }) => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      if (errors > 0) {
        toast({
          title: 'Importação com erros',
          description: `${inserted} inseridos · ${skipped} já existiam · ${errors} erros${errorMessage ? ` (${errorMessage})` : ''}`,
          variant: 'destructive',
        });
      } else if (inserted === 0 && skipped > 0) {
        toast({
          title: 'Nenhum processo novo',
          description: `${skipped} já existiam no sistema`,
        });
      } else if (inserted === 0 && skipped === 0) {
        toast({ title: 'Nenhum processo válido para importar' });
      } else {
        toast({
          title: 'Importação concluída',
          description: `${inserted} inseridos · ${skipped} já existiam`,
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao importar', description: error.message, variant: 'destructive' });
    },
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

  return {
    processes,
    totalCount,
    isLoading,
    error,
    createProcess,
    createProcessesBatch,
    updateProcess,
    deleteProcess,
    isCreating: createProcess.isPending,
    isUpdating: updateProcess.isPending,
    isDeleting: deleteProcess.isPending,
    isImporting: createProcessesBatch.isPending,
  };
}
