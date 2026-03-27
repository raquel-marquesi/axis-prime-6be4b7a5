import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CollectiveParticipant { id: string; reclamante_nome: string; reclamante_cpf: string | null; }

export function useCollectiveProcessParticipants(processId: string | null, tipoAcao: 'individual' | 'coletiva' | null) {
  const { data: participants = [], isLoading, error } = useQuery({
    queryKey: ['collective-participants', processId],
    queryFn: async () => {
      if (!processId) return [];
      const { data: mainProcess, error: mainError } = await supabase.from('processes').select('numero_processo, reclamante_nome, reclamante_cpf').eq('id', processId).single();
      if (mainError) throw mainError;
      const { data, error } = await supabase.from('processes').select('id, reclamante_nome, reclamante_cpf').eq('numero_processo', mainProcess.numero_processo).order('reclamante_nome');
      if (error) throw error;
      return data as CollectiveParticipant[];
    },
    enabled: !!processId && tipoAcao === 'coletiva',
  });
  return { participants, isLoading, error };
}
