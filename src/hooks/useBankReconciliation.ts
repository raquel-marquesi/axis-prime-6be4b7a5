import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface BankStatement {
  id: string;
  file_name: string;
  file_path: string;
  bank_name: string;
  period_start: string | null;
  period_end: string | null;
  uploaded_by: string | null;
  created_at: string;
  entry_count?: number;
  conciliado_count?: number;
  pendente_count?: number;
}

export interface BankStatementEntry {
  id: string;
  statement_id: string;
  data_transacao: string;
  descricao: string;
  valor: number;
  tipo: string;
  matched_invoice_id: string | null;
  matched_expense_id: string | null;
  status: string;
  created_at: string;
  matched_invoice?: { numero_nf: string | null; valor: number | null; data_vencimento: string | null } | null;
  matched_expense?: { descricao: string; valor: number; data_vencimento: string } | null;
}

export function useBankReconciliation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const statementsQuery = useQuery({
    queryKey: ['bank-statements'],
    queryFn: async () => {
      const { data: statements, error } = await supabase
        .from('bank_statements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const result: BankStatement[] = [];
      for (const stmt of statements) {
        const { data: entries } = await supabase
          .from('bank_statement_entries')
          .select('status')
          .eq('statement_id', stmt.id);

        const entryCount = entries?.length || 0;
        const conciliadoCount = entries?.filter(e => e.status === 'conciliado').length || 0;
        const pendenteCount = entries?.filter(e => e.status === 'pendente').length || 0;

        result.push({
          ...stmt,
          entry_count: entryCount,
          conciliado_count: conciliadoCount,
          pendente_count: pendenteCount,
        } as BankStatement);
      }
      return result;
    },
  });

  const useStatementEntries = (statementId: string | null) =>
    useQuery({
      queryKey: ['bank-statement-entries', statementId],
      enabled: !!statementId,
      queryFn: async () => {
        if (!statementId) return [];
        const { data, error } = await supabase
          .from('bank_statement_entries')
          .select('*, invoices(numero_nf, valor, data_vencimento), expenses(descricao, valor, data_vencimento)')
          .eq('statement_id', statementId)
          .order('data_transacao', { ascending: true });
        if (error) throw error;
        return (data || []).map((entry: any) => ({
          ...entry,
          matched_invoice: entry.invoices || null,
          matched_expense: entry.expenses || null,
        })) as BankStatementEntry[];
      },
    });

  const uploadStatement = useMutation({
    mutationFn: async ({ file, bankName }: { file: File; bankName: string }) => {
      const filePath = `${user?.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('bank-statements')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase.functions.invoke('parse-bank-statement', {
        body: { file_path: filePath, file_name: file.name, bank_name: bankName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      toast({
        title: 'Extrato processado com sucesso',
        description: `${data.total} lançamentos importados, ${data.matched} conciliados automaticamente`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao processar extrato', description: error.message, variant: 'destructive' });
    },
  });

  const matchEntry = useMutation({
    mutationFn: async ({ entryId, invoiceId, expenseId }: { entryId: string; invoiceId?: string; expenseId?: string }) => {
      const updates: any = { status: 'conciliado' };
      if (invoiceId) updates.matched_invoice_id = invoiceId;
      if (expenseId) updates.matched_expense_id = expenseId;

      const { error } = await supabase
        .from('bank_statement_entries')
        .update(updates)
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      toast({ title: 'Lançamento vinculado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao vincular', description: error.message, variant: 'destructive' });
    },
  });

  const unmatchEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('bank_statement_entries')
        .update({ status: 'pendente', matched_invoice_id: null, matched_expense_id: null })
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      toast({ title: 'Vínculo desfeito' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const ignoreEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('bank_statement_entries')
        .update({ status: 'ignorado' })
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      toast({ title: 'Lançamento ignorado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  return {
    statements: statementsQuery.data || [],
    isLoading: statementsQuery.isLoading,
    useStatementEntries,
    uploadStatement,
    matchEntry,
    unmatchEntry,
    ignoreEntry,
  };
}
