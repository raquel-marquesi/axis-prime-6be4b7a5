import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BankAccountConfig {
  id: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo: string;
  descricao: string | null;
  is_active: boolean;
  branch_id: string | null;
  company_entity_id: string | null;
  company_entity_name: string | null;
  cedente: string | null;
  carteira: string | null;
  numero_convenio: string | null;
  created_at: string;
}

export function useBankAccountsConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bankAccounts = [], isLoading } = useQuery({
    queryKey: ['bank-accounts-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts_config')
        .select('*, company_entities(razao_social)')
        .order('banco');
      if (error) throw error;
      return (data as any[]).map((row) => ({
        id: row.id,
        banco: row.banco,
        agencia: row.agencia,
        conta: row.conta,
        tipo: row.tipo,
        descricao: row.descricao,
        is_active: row.is_active,
        branch_id: row.branch_id,
        company_entity_id: row.company_entity_id,
        company_entity_name: row.company_entities?.razao_social ?? null,
        cedente: row.cedente,
        carteira: row.carteira,
        numero_convenio: row.numero_convenio,
        created_at: row.created_at,
      })) as BankAccountConfig[];
    },
  });

  const createBankAccount = useMutation({
    mutationFn: async (data: Omit<BankAccountConfig, 'id' | 'created_at' | 'is_active' | 'company_entity_name'>) => {
      const { company_entity_name, ...rest } = data as any;
      const { error } = await supabase.from('bank_accounts_config').insert(rest);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-config'] });
      toast({ title: 'Conta bancária criada' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateBankAccount = useMutation({
    mutationFn: async ({ id, ...data }: Partial<BankAccountConfig> & { id: string }) => {
      const { company_entity_name, ...rest } = data as any;
      const { error } = await supabase.from('bank_accounts_config').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-config'] });
      toast({ title: 'Conta bancária atualizada' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { bankAccounts, isLoading, createBankAccount, updateBankAccount };
}
