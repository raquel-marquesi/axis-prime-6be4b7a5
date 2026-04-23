import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Invoice {
  id: string; account_id: string; billing_contact_id: string; client_id: string | null;
  numero_nf: string | null; valor: number | null; data_emissao: string | null;
  data_vencimento: string | null; status: string; descricao: string | null;
  created_at: string; updated_at: string;
}

export function useInvoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invoicesQuery = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices')
        .select('*, accounts(nome), billing_contacts(razao_social, cpf_cnpj), clients(nome, razao_social, nome_fantasia)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createInvoice = useMutation({
    mutationFn: async (invoice: any) => {
      const { data, error } = await supabase.from('invoices').insert({ ...invoice, created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); toast({ title: 'Faturamento criado' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...formData }: any & { id: string }) => {
      const { data, error } = await supabase.from('invoices').update(formData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); toast({ title: 'Faturamento atualizado' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }); },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); toast({ title: 'Faturamento excluído' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); },
  });

  return { invoices: invoicesQuery.data || [], isLoading: invoicesQuery.isLoading, createInvoice, updateInvoice, deleteInvoice };
}
