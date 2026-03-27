import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ProcessFormData } from './useProcesses';
import { useClients } from './useClients';

export function useProcessWithFolder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { clients } = useClients();

  const createProcessWithFolder = useMutation({
    mutationFn: async ({ formData }: { formData: ProcessFormData }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: process, error: processError } = await supabase.from('processes').insert({ ...formData, created_by: user.user?.id }).select().single();
      if (processError) throw processError;
      const client = clients.find(c => c.id === formData.id_cliente);
      const clientName = client?.tipo === 'juridica' ? client.razao_social || 'Cliente' : client?.nome || 'Cliente';
      try {
        const userEmail = session?.user?.email;
        if (userEmail) {
          const { data: folderData, error: folderError } = await supabase.functions.invoke('google-drive', { body: { action: 'createProcessFolder', userEmail, clientName, processNumber: formData.numero_processo, folderNumber: process.numero_pasta } });
          if (folderError) { console.error('Erro ao criar pasta no Drive:', folderError); }
          else if (folderData?.processFolder?.id) { await supabase.from('processes').update({ drive_folder_id: folderData.processFolder.id }).eq('id', process.id); }
        }
      } catch (driveError) { console.error('Erro ao criar pasta no Drive:', driveError); }
      return process;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['processes'] }); toast({ title: 'Processo criado', description: 'O processo foi cadastrado e a pasta foi criada no Drive.' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao criar processo', description: error.message, variant: 'destructive' }); },
  });

  const linkFolderToProcess = useMutation({
    mutationFn: async ({ processId, clientName, processNumber, folderNumber }: { processId: string; clientName: string; processNumber: string; folderNumber: number }) => {
      const userEmail = session?.user?.email;
      if (!userEmail) throw new Error('Usuário não autenticado');
      const { data: folderData, error: folderError } = await supabase.functions.invoke('google-drive', { body: { action: 'createProcessFolder', userEmail, clientName, processNumber, folderNumber } });
      if (folderError) throw folderError;
      if (folderData?.processFolder?.id) { const { error: updateError } = await supabase.from('processes').update({ drive_folder_id: folderData.processFolder.id }).eq('id', processId); if (updateError) throw updateError; }
      return folderData;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['processes'] }); toast({ title: 'Pasta vinculada' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao criar pasta', description: error.message, variant: 'destructive' }); },
  });

  return { createProcessWithFolder, linkFolderToProcess };
}
