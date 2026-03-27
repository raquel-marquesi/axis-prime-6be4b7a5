import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Boleto {
  id: string;
  billing_contact_id: string | null;
  amount: number;
  due_date: string;
  status: string;
  barcode: string | null;
  our_number: string | null;
  pdf_url: string | null;
  sent_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  billing_contacts?: { razao_social: string; cpf_cnpj: string } | null;
}

export function useBoletos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['boletos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boletos')
        .select('*, billing_contacts(razao_social, cpf_cnpj)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Boleto[];
    },
  });

  const stats = {
    total: query.data?.length || 0,
    generated: query.data?.filter(b => b.status === 'generated').length || 0,
    sent: query.data?.filter(b => b.status === 'sent').length || 0,
    paid: query.data?.filter(b => b.status === 'paid').length || 0,
    cancelled: query.data?.filter(b => b.status === 'cancelled').length || 0,
    totalAmount: query.data?.reduce((sum, b) => sum + Number(b.amount), 0) || 0,
    paidAmount: query.data?.filter(b => b.status === 'paid').reduce((sum, b) => sum + Number(b.amount), 0) || 0,
  };

  const createBoleto = useMutation({
    mutationFn: async (boleto: Omit<Boleto, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'billing_contacts'>) => {
      const { data, error } = await supabase.from('boletos').insert({ ...boleto, created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      toast({ title: 'Boleto gerado com sucesso' });
    },
    onError: (e: Error) => toast({ title: 'Erro ao gerar boleto', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, ...extra }: { id: string; status: string; sent_at?: string; paid_at?: string }) => {
      const { data, error } = await supabase.from('boletos').update({ status, ...extra }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      toast({ title: 'Status do boleto atualizado' });
    },
    onError: (e: Error) => toast({ title: 'Erro ao atualizar boleto', description: e.message, variant: 'destructive' }),
  });

  return { boletos: query.data || [], isLoading: query.isLoading, stats, createBoleto, updateStatus };
}
