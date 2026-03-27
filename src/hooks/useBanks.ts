import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Bank {
  id: string;
  codigo: string;
  nome: string;
  is_active: boolean;
  created_at: string;
}

export function useBanks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: banks = [], isLoading } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('banks').select('*').order('codigo');
      if (error) throw error;
      return data as Bank[];
    },
  });

  const activeBanks = banks.filter((b) => b.is_active);

  const createBank = useMutation({
    mutationFn: async (data: { codigo: string; nome: string }) => {
      const { error } = await supabase.from('banks').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast({ title: 'Banco cadastrado' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateBank = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Bank> & { id: string }) => {
      const { error } = await supabase.from('banks').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast({ title: 'Banco atualizado' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { banks, activeBanks, isLoading, createBank, updateBank };
}
