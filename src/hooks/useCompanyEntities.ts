import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CompanyEntity { id: string; razao_social: string; cnpj: string; nome_fantasia: string | null; is_active: boolean; created_at: string; }

export function useCompanyEntities() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['company-entities'],
    queryFn: async () => { const { data, error } = await supabase.from('company_entities').select('*').order('razao_social'); if (error) throw error; return data as CompanyEntity[]; },
  });

  const createEntity = useMutation({
    mutationFn: async (data: { razao_social: string; cnpj: string; nome_fantasia?: string }) => { const { error } = await supabase.from('company_entities').insert(data); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['company-entities'] }); toast({ title: 'Empresa criada' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateEntity = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CompanyEntity> & { id: string }) => { const { error } = await supabase.from('company_entities').update(data).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['company-entities'] }); toast({ title: 'Empresa atualizada' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { entities, isLoading, createEntity, updateEntity };
}
