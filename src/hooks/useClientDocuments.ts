import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClientDocument {
  id: string;
  client_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useClientDocuments(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['client-documents', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from('client_documents').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClientDocument[];
    },
    enabled: !!clientId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ clientId, file }: { clientId: string; file: File }) => {
      const { data: user } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const filePath = `${clientId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('client-documents').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data, error } = await supabase.from('client_documents').insert({ client_id: clientId, file_name: file.name, file_path: filePath, file_size: file.size, mime_type: file.type, uploaded_by: user.user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-documents'] }); toast({ title: 'Documento enviado', description: 'O documento foi anexado com sucesso.' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao enviar documento', description: error.message, variant: 'destructive' }); },
  });

  const deleteDocument = useMutation({
    mutationFn: async (document: ClientDocument) => {
      const { error: storageError } = await supabase.storage.from('client-documents').remove([document.file_path]);
      if (storageError) throw storageError;
      const { error } = await supabase.from('client_documents').delete().eq('id', document.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-documents'] }); toast({ title: 'Documento excluído' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao excluir documento', description: error.message, variant: 'destructive' }); },
  });

  const getDocumentUrl = async (filePath: string): Promise<string | null> => {
    const { data } = await supabase.storage.from('client-documents').createSignedUrl(filePath, 3600);
    return data?.signedUrl || null;
  };

  return { documents, isLoading, error, uploadDocument, deleteDocument, getDocumentUrl };
}
