import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClientSlaRule { id: string; client_id: string; calculation_type: string | null; deadline_hours: number; description: string | null; created_at: string; }
export interface SlaRuleFormData { client_id: string; calculation_type?: string | null; deadline_hours: number; description?: string | null; }

export function useClientSlaRules(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['client-sla-rules', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from('client_sla_rules').select('*').eq('client_id', clientId).order('calculation_type', { ascending: true, nullsFirst: true });
      if (error) throw error;
      return data as ClientSlaRule[];
    },
    enabled: !!clientId,
  });

  const createRule = useMutation({
    mutationFn: async (formData: SlaRuleFormData) => { const { data, error } = await supabase.from('client_sla_rules').insert(formData).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-sla-rules', clientId] }); toast({ title: 'Regra SLA criada' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao criar regra SLA', description: error.message, variant: 'destructive' }); },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...formData }: SlaRuleFormData & { id: string }) => { const { data, error } = await supabase.from('client_sla_rules').update(formData).eq('id', id).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-sla-rules', clientId] }); toast({ title: 'Regra SLA atualizada' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao atualizar regra SLA', description: error.message, variant: 'destructive' }); },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('client_sla_rules').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-sla-rules', clientId] }); toast({ title: 'Regra SLA removida' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao remover regra SLA', description: error.message, variant: 'destructive' }); },
  });

  return { rules, isLoading, createRule, updateRule, deleteRule };
}
