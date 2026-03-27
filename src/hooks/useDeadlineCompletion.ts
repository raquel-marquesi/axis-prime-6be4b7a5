import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DeadlineCompletionData { deadline_id: string; process_id: string; activity_type_id: string; data_atividade: string; descricao: string; document_url?: string; file?: File; reclamante_nome?: string; drive_folder_url?: string; }

export function useDeadlineCompletion() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const completeDeadline = useMutation({
    mutationFn: async (data: DeadlineCompletionData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');
      if (data.descricao.trim().length < 10) throw new Error('A descrição deve ter pelo menos 10 caracteres');
      const today = new Date(); today.setHours(23, 59, 59, 999);
      if (new Date(data.data_atividade) > today) throw new Error('A data da atividade não pode ser futura');
      const hasLink = data.document_url && data.document_url.trim().length > 0;
      const hasFile = !!data.file;
      if (!hasLink && !hasFile) throw new Error('Anexo obrigatório: envie um arquivo ou insira um link do Google Drive');

      let finalDocumentUrl = data.document_url?.trim() || '';
      if (data.file) {
        const ext = data.file.name.split('.').pop() || 'pdf';
        const filePath = `${user.user.id}/${data.process_id}/${data.deadline_id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('deadline-documents').upload(filePath, data.file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw new Error(`Erro ao enviar arquivo: ${uploadError.message}`);
        finalDocumentUrl = `storage://deadline-documents/${filePath}`;
      }

      const { data: timesheetEntry, error: timesheetError } = await supabase.from('timesheet_entries').insert({ user_id: user.user.id, process_id: data.process_id, activity_type_id: data.activity_type_id, data_atividade: data.data_atividade, descricao: data.descricao.trim(), deadline_id: data.deadline_id, quantidade: 1, reclamante_nome: data.reclamante_nome || null, drive_folder_url: data.drive_folder_url || null }).select().single();
      if (timesheetError) throw new Error(`Erro ao criar entrada no timesheet: ${timesheetError.message}`);

      const { error: deadlineError } = await supabase.from('process_deadlines').update({ is_completed: true, completed_at: new Date().toISOString(), document_url: finalDocumentUrl, timesheet_entry_id: timesheetEntry.id }).eq('id', data.deadline_id);
      if (deadlineError) {
        await supabase.from('timesheet_entries').delete().eq('id', timesheetEntry.id);
        throw new Error(`Erro ao atualizar prazo: ${deadlineError.message}`);
      }
      return { timesheetEntry, deadline_id: data.deadline_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['process-deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['timesheet'] });
      toast({ title: 'Prazo concluído', description: 'O prazo foi marcado como concluído e a atividade foi registrada no timesheet.' });
    },
    onError: (error: Error) => { toast({ title: 'Erro ao concluir prazo', description: error.message, variant: 'destructive' }); },
  });

  return { completeDeadline };
}
