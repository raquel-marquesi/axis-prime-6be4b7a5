import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PessoaTipo = 'fisica' | 'juridica';
export type TipoCadastro = 'cliente' | 'fornecedor';
export type IndicacaoTipo = 'percentual' | 'fixo';
export type ContatoTipo = 'principal' | 'financeiro' | 'alternativo';

export interface Client {
  id: string;
  tipo: PessoaTipo;
  tipo_cadastro: TipoCadastro;
  nome: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  rg: string | null;
  razao_social: string | null;
  cnpj: string | null;
  nome_fantasia: string | null;
  representante_legal: string | null;
  centro_custo: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  indicacao_por: string | null;
  indicacao_tipo: IndicacaoTipo | null;
  indicacao_valor: number | null;
  indicacao_responsavel: string | null;
  indicacao_email: string | null;
  indicacao_banco: string | null;
  indicacao_agencia: string | null;
  indicacao_conta_corrente: string | null;
  contrato_objeto: string | null;
  contrato_data_inicio: string | null;
  contrato_data_vencimento: string | null;
  contrato_condicoes_faturamento: string | null;
  observacoes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  branch_ids: string[];
  branch_nomes: string[];
  economic_group_id: string | null;
  contract_key_id: string | null;
  economic_group_nome: string | null;
  contract_key_nome: string | null;
}

export interface ClientFormData {
  tipo: PessoaTipo;
  tipo_cadastro?: TipoCadastro;
  is_active?: boolean;
  nome?: string;
  cpf?: string;
  razao_social?: string;
  cnpj?: string;
  nome_fantasia?: string;
  centro_custo?: string;
  economic_group_id?: string | null;
  contract_key_id?: string | null;
  observacoes?: string;
  [key: string]: any;
}

export function useClients() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select(`
          *,
          economic_groups(nome),
          contract_keys(nome),
          client_branches(branch_id, branches(nome))
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (clientsData || []).map((c: any) => ({
        ...c,
        tipo_cadastro: c.tipo_cadastro || 'cliente',
        branch_ids: (c.client_branches || []).map((cb: any) => cb.branch_id),
        branch_nomes: (c.client_branches || []).map((cb: any) => cb.branches?.nome || ''),
        economic_group_nome: c.economic_groups?.nome || null,
        contract_key_nome: c.contract_keys?.nome || null,
      })) as Client[];
    },
  });

  const createClient = useMutation({
    mutationFn: async (formData: ClientFormData & { branch_ids?: string[] }) => {
      const { data: user } = await supabase.auth.getUser();
      const { branch_ids, ...clientData } = formData;
      const { data, error } = await supabase.from('clients').insert({ ...clientData, created_by: user.user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast({ title: 'Cliente criado' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao criar cliente', description: error.message, variant: 'destructive' }); },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, branch_ids, ...formData }: ClientFormData & { id: string; branch_ids?: string[] }) => {
      const { data, error } = await supabase.from('clients').update(formData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast({ title: 'Cliente atualizado' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }); },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast({ title: 'Cliente excluído' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); },
  });

  const checkDuplicate = async (document: string, tipo: PessoaTipo): Promise<boolean> => {
    const field = tipo === 'fisica' ? 'cpf' : 'cnpj';
    const { data } = await supabase.from('clients').select('id').eq(field, document).maybeSingle();
    return !!data;
  };

  return {
    clients,
    isLoading,
    error,
    createClient,
    updateClient,
    deleteClient,
    checkDuplicate,
    isCreating: createClient.isPending,
    isUpdating: updateClient.isPending,
    isDeleting: deleteClient.isPending,
  };
}

export interface ClientContact {
  id: string;
  client_id: string;
  nome: string;
  cargo: string | null;
  tipo: string;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ContactFormData {
  client_id: string;
  nome: string;
  cargo?: string;
  tipo: ContatoTipo;
  telefone?: string;
  celular?: string;
  email?: string;
  id?: string;
}

export function useClientContacts(clientId?: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ['client-contacts', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from('client_contacts').select('*').eq('client_id', clientId).order('created_at');
      if (error) throw error;
      return data as ClientContact[];
    },
    enabled: !!clientId,
  });

  const createContact = useMutation({
    mutationFn: async (formData: ContactFormData) => {
      const { data, error } = await supabase.from('client_contacts').insert(formData).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-contacts', clientId] }); },
    onError: (error: Error) => { toast({ title: 'Erro ao criar contato', description: error.message, variant: 'destructive' }); },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...formData }: ContactFormData & { id: string }) => {
      const { data, error } = await supabase.from('client_contacts').update(formData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-contacts', clientId] }); },
    onError: (error: Error) => { toast({ title: 'Erro ao atualizar contato', description: error.message, variant: 'destructive' }); },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-contacts', clientId] }); },
    onError: (error: Error) => { toast({ title: 'Erro ao excluir contato', description: error.message, variant: 'destructive' }); },
  });

  return {
    contacts,
    createContact,
    updateContact,
    deleteContact,
    isCreating: createContact.isPending,
    isUpdating: updateContact.isPending,
    isDeleting: deleteContact.isPending,
  };
}
