import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ExecutionResult { execution_id: string; status: string; summary: { files_found: number; files_new: number; files_processed: number; files_failed: number; files_skipped: number; }; processed_files: any[]; errors: string[]; duration_seconds: number; }
interface AgentExecution { id: string; execution_id: string; started_at: string; finished_at: string | null; total_files_found: number; new_files_count: number; processed_count: number; failed_count: number; status: string; error_message: string | null; }
interface RunOptions { userEmail: string; folderIdToMonitor: string; destinationParentId?: string; notifyEmails?: string[]; options?: { maxFilesToProcess?: number; filterByDate?: boolean; hoursBack?: number; createFolderStructure?: boolean; sendNotifications?: boolean; }; }

export function useContractMonitor() {
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: executions = [], isLoading: loadingExecutions } = useQuery({
    queryKey: ['agent-executions'],
    queryFn: async () => { const { data, error } = await supabase.from('agent_executions').select('*').order('started_at', { ascending: false }).limit(20); if (error) throw error; return data as AgentExecution[]; }
  });

  const { data: processedFiles = [], isLoading: loadingFiles } = useQuery({
    queryKey: ['processed-files'],
    queryFn: async () => { const { data, error } = await supabase.from('processed_files').select('*, clients(nome_fantasia, razao_social)').order('created_at', { ascending: false }).limit(50); if (error) throw error; return data; }
  });

  const runAgent = useMutation({
    mutationFn: async (options: RunOptions): Promise<ExecutionResult> => {
      setIsRunning(true);
      const { data, error } = await supabase.functions.invoke('contract-monitor', { body: { action: 'run', ...options } });
      if (error) throw error;
      return data as ExecutionResult;
    },
    onSuccess: (result) => {
      setIsRunning(false);
      queryClient.invalidateQueries({ queryKey: ['agent-executions'] });
      queryClient.invalidateQueries({ queryKey: ['processed-files'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      if (result.status === 'completed') { toast({ title: 'Execução concluída', description: `${result.summary.files_processed} arquivo(s) processado(s) com sucesso.` }); }
      else { toast({ title: 'Execução com erros', description: result.errors.join('; '), variant: 'destructive' }); }
    },
    onError: (error: Error) => { setIsRunning(false); toast({ title: 'Erro na execução', description: error.message, variant: 'destructive' }); }
  });

  const scanFiles = useCallback(async (userEmail: string, folderId: string) => {
    const { data, error } = await supabase.functions.invoke('contract-monitor', { body: { action: 'scan', userEmail, folderIdToMonitor: folderId } });
    if (error) throw error;
    return data;
  }, []);

  const getStatus = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('contract-monitor', { body: { action: 'status' } });
    if (error) throw error;
    return data;
  }, []);

  return { executions, processedFiles, isRunning, loadingExecutions, loadingFiles, runAgent: runAgent.mutate, scanFiles, getStatus, lastExecution: executions[0] || null };
}
