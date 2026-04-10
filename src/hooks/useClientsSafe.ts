import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientSafe {
  id: string;
  tipo: string;
  tipo_cadastro: string;
  nome: string | null;
  razao_social: string | null;
  cnpj: string | null;
  nome_fantasia: string | null;
  centro_custo: string | null;
  is_active: boolean;
  contrato_objeto: string | null;
  contrato_data_inicio: string | null;
  contrato_data_vencimento: string | null;
  contrato_condicoes_faturamento: string | null;
  dia_emissao_nf: number | null;
  dia_vencimento: number | null;
  billing_reminder_enabled: boolean | null;
  economic_group_id: string | null;
}

export function useClientsSafe() {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients-safe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients_safe')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data as ClientSafe[];
    },
  });

  return { clients, isLoading };
}
