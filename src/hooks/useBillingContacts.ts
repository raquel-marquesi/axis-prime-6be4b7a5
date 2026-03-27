import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface BillingContact {
  id: string;
  account_id: string;
  razao_social: string;
  cpf_cnpj: string;
  tipo_documento: string | null;
  endereco_cep: string | null;
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_estado: string | null;
  email_nf: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  nome_caso_projeto: string | null;
  centro_custo: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type BillingContactInsert = Omit<BillingContact, 'id' | 'created_at' | 'updated_at'>;

export function useBillingContacts(accountId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const contactsQuery = useQuery({
    queryKey: ['billing_contacts', accountId],
    queryFn: async () => {
      let query = supabase.from('billing_contacts').select('*').order('razao_social');
      if (accountId) {
        query = query.eq('account_id', accountId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as BillingContact[];
    },
  });

  const createContact = useMutation({
    mutationFn: async (contact: Omit<BillingContactInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('billing_contacts')
        .insert({ ...contact, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_contacts'] });
      toast({ title: 'Contato de faturamento criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar contato', description: error.message, variant: 'destructive' });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BillingContact> & { id: string }) => {
      const { data, error } = await supabase
        .from('billing_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_contacts'] });
      toast({ title: 'Contato atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar contato', description: error.message, variant: 'destructive' });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('billing_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_contacts'] });
      toast({ title: 'Contato excluído com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir contato', description: error.message, variant: 'destructive' });
    },
  });

  return {
    contacts: contactsQuery.data || [],
    isLoading: contactsQuery.isLoading,
    createContact,
    updateContact,
    deleteContact,
  };
}
