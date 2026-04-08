import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BillingPreview {
  id: string;
  client_id: string | null;
  reference_month: string;
  status: string;
  total_items: number;
  total_value: number;
  invoice_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingPreviewItem {
  id: string;
  preview_id: string;
  timesheet_entry_id: string | null;
  process_id: string | null;
  numero_processo: string | null;
  reclamante: string | null;
  tipo_atividade: string | null;
  data_atividade: string | null;
  descricao: string | null;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  is_duplicate: boolean;
  is_billable: boolean;
  exclusion_reason: string | null;
  created_at: string;
}

export function useBillingPreview(previewId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const previewsQuery = useQuery({
    queryKey: ['billing_previews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_previews' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BillingPreview[];
    },
  });

  const itemsQuery = useQuery({
    queryKey: ['billing_preview_items', previewId],
    enabled: !!previewId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_preview_items' as any)
        .select('*')
        .eq('preview_id', previewId!)
        .order('numero_processo', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as BillingPreviewItem[];
    },
  });

  const generatePreview = useMutation({
    mutationFn: async ({ clientId, referenceMonth }: { clientId: string; referenceMonth: string }) => {
      // 1. Fetch timesheet entries for this client + month
      const startDate = `${referenceMonth}-01`;
      const endDate = new Date(
        parseInt(referenceMonth.split('-')[0]),
        parseInt(referenceMonth.split('-')[1]),
        0
      ).toISOString().split('T')[0];

      const { data: entries, error: entriesError } = await supabase
        .from('timesheet_entries')
        .select('id, process_id, data_atividade, descricao, reclamante_nome, quantidade, activity_type_id')
        .eq('client_id', clientId)
        .gte('data_atividade', startDate)
        .lte('data_atividade', endDate)
        .order('data_atividade', { ascending: true });

      if (entriesError) throw entriesError;
      if (!entries || entries.length === 0) throw new Error('Nenhum lançamento encontrado para este cliente/mês');

      // 2. Fetch process numbers
      const processIds = [...new Set(entries.map(e => e.process_id).filter(Boolean))];
      let processMap: Record<string, string> = {};
      if (processIds.length > 0) {
        // Paginate to avoid 1000 row limit
        for (let i = 0; i < processIds.length; i += 500) {
          const batch = processIds.slice(i, i + 500);
          const { data: procs } = await supabase
            .from('processes')
            .select('id, numero_processo')
            .in('id', batch);
          if (procs) {
            procs.forEach(p => { processMap[p.id] = p.numero_processo || ''; });
          }
        }
      }

      // 3. Fetch activity type names
      const actTypeIds = [...new Set(entries.map(e => e.activity_type_id).filter(Boolean))];
      let actTypeMap: Record<string, string> = {};
      if (actTypeIds.length > 0) {
        const { data: types } = await supabase
          .from('activity_types')
          .select('id, name')
          .in('id', actTypeIds);
        if (types) {
          types.forEach(t => { actTypeMap[t.id] = t.name; });
        }
      }

      // 4. Fetch contract pricing for this client
      const { data: clientData } = await supabase
        .from('clients')
        .select('nome, razao_social')
        .eq('id', clientId)
        .single();

      const clientName = clientData?.razao_social || clientData?.nome || '';
      let valorUnitario = 0;

      if (clientName) {
        const { data: pricing } = await supabase
          .from('contract_pricing')
          .select('valor, tipo_calculo')
          .or(`client_id.eq.${clientId},cliente_nome.ilike.%${clientName}%`)
          .eq('is_active', true)
          .limit(1);
        if (pricing && pricing.length > 0 && pricing[0].valor) {
          valorUnitario = Number(pricing[0].valor);
        }
      }

      // 5. Detect duplicates (same process + same date + same description)
      const seen = new Map<string, number>();
      const duplicateIndices = new Set<number>();
      entries.forEach((entry, idx) => {
        const key = `${entry.process_id}|${entry.data_atividade}|${(entry.descricao || '').trim().toLowerCase()}`;
        if (seen.has(key)) {
          duplicateIndices.add(idx);
          duplicateIndices.add(seen.get(key)!);
        } else {
          seen.set(key, idx);
        }
      });

      // 6. Create the preview header
      const items = entries.map((entry, idx) => {
        const isDuplicate = duplicateIndices.has(idx);
        const isBillable = !isDuplicate;
        const qty = entry.quantidade || 1;
        return {
          timesheet_entry_id: entry.id,
          process_id: entry.process_id,
          numero_processo: entry.process_id ? processMap[entry.process_id] || '' : '',
          reclamante: entry.reclamante_nome || '',
          tipo_atividade: entry.activity_type_id ? actTypeMap[entry.activity_type_id] || 'Não classificado' : 'Não classificado',
          data_atividade: entry.data_atividade,
          descricao: entry.descricao || '',
          quantidade: qty,
          valor_unitario: valorUnitario,
          valor_total: qty * valorUnitario,
          is_duplicate: isDuplicate,
          is_billable: isBillable,
          exclusion_reason: isDuplicate ? 'Duplicata detectada automaticamente' : null,
        };
      });

      const billableItems = items.filter(i => i.is_billable);
      const totalValue = billableItems.reduce((sum, i) => sum + i.valor_total, 0);

      const { data: preview, error: previewError } = await supabase
        .from('billing_previews' as any)
        .insert({
          client_id: clientId,
          reference_month: startDate,
          status: 'draft',
          total_items: billableItems.length,
          total_value: totalValue,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (previewError) throw previewError;

      // 7. Insert items in batches
      const previewData = preview as unknown as BillingPreview;
      const itemsToInsert = items.map(item => ({
        ...item,
        preview_id: previewData.id,
      }));

      for (let i = 0; i < itemsToInsert.length; i += 500) {
        const batch = itemsToInsert.slice(i, i + 500);
        const { error: itemsError } = await supabase
          .from('billing_preview_items' as any)
          .insert(batch as any);
        if (itemsError) throw itemsError;
      }

      return previewData;
    },
    onSuccess: () => {
      toast.success('Pré-relatório gerado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['billing_previews'] });
    },
    onError: (err: any) => toast.error('Erro ao gerar pré-relatório: ' + err.message),
  });

  const updateItemBillable = useMutation({
    mutationFn: async ({ itemId, isBillable, reason }: { itemId: string; isBillable: boolean; reason?: string }) => {
      const { error } = await supabase
        .from('billing_preview_items' as any)
        .update({
          is_billable: isBillable,
          exclusion_reason: isBillable ? null : (reason || 'Removido manualmente'),
        } as any)
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_preview_items', previewId] });
      queryClient.invalidateQueries({ queryKey: ['billing_previews'] });
    },
  });

  const approvePreview = useMutation({
    mutationFn: async (id: string) => {
      // Recalculate totals from billable items
      const { data: items, error: itemsError } = await supabase
        .from('billing_preview_items' as any)
        .select('*')
        .eq('preview_id', id)
        .eq('is_billable', true);

      if (itemsError) throw itemsError;
      const allItems = (items || []) as unknown as BillingPreviewItem[];
      const totalValue = allItems.reduce((sum, i) => sum + Number(i.valor_total), 0);

      const { error } = await supabase
        .from('billing_previews' as any)
        .update({
          status: 'approved',
          total_items: allItems.length,
          total_value: totalValue,
        } as any)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pré-relatório aprovado');
      queryClient.invalidateQueries({ queryKey: ['billing_previews'] });
    },
    onError: (err: any) => toast.error('Erro ao aprovar: ' + err.message),
  });

  return {
    previews: previewsQuery.data || [],
    isLoadingPreviews: previewsQuery.isLoading,
    items: itemsQuery.data || [],
    isLoadingItems: itemsQuery.isLoading,
    generatePreview,
    updateItemBillable,
    approvePreview,
  };
}
