import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface NfseConfig { id: string; razao_social: string; cnpj: string; inscricao_municipal: string; codigo_servico: string; codigo_tributacao_municipio: string | null; natureza_operacao: number | null; certificado_a1_base64: string | null; senha_certificado: string | null; aliquota_iss: number; regime_tributario: string; endereco_logradouro: string | null; endereco_numero: string | null; endereco_complemento: string | null; endereco_bairro: string | null; endereco_cidade: string | null; endereco_estado: string | null; endereco_cep: string | null; email_contato: string | null; provider: string; provider_api_url: string | null; is_active: boolean; created_at: string; updated_at: string; }
export type NfseConfigInsert = Omit<NfseConfig, 'id' | 'created_at' | 'updated_at'>;

export function useNfse() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const configQuery = useQuery({ queryKey: ['nfse_config'], queryFn: async () => { const { data, error } = await supabase.from('nfse_config').select('*').eq('is_active', true).limit(1).maybeSingle(); if (error) throw error; return data as NfseConfig | null; } });
  const nfseInvoicesQuery = useQuery({ queryKey: ['nfse_invoices'], queryFn: async () => { const { data, error } = await supabase.from('invoices').select('*, accounts(nome), billing_contacts(razao_social, cpf_cnpj)').order('created_at', { ascending: false }); if (error) throw error; return data; } });

  const saveConfig = useMutation({ mutationFn: async (config: Partial<NfseConfigInsert> & { id?: string }) => { if (config.id) { const { id, ...updates } = config; const { data, error } = await supabase.from('nfse_config').update(updates).eq('id', id).select().single(); if (error) throw error; return data; } else { const { data, error } = await supabase.from('nfse_config').insert(config as NfseConfigInsert).select().single(); if (error) throw error; return data; } }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['nfse_config'] }); toast({ title: 'Configuração NFS-e salva' }); }, onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); } });
  const emitNfse = useMutation({ mutationFn: async (params: { invoice_id: string; codigo_servico?: string; discriminacao?: string; aliquota_iss?: number; deducoes?: number }) => { const { data, error } = await supabase.functions.invoke('emit-nfe', { body: params }); if (error) throw error; if (data?.error) throw new Error(data.error); return data; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['nfse_invoices'] }); queryClient.invalidateQueries({ queryKey: ['invoices'] }); toast({ title: 'NFS-e enviada para emissão' }); }, onError: (error: Error) => { toast({ title: 'Erro ao emitir NFS-e', description: error.message, variant: 'destructive' }); } });
  const cancelNfse = useMutation({ mutationFn: async (invoiceId: string) => { const { data, error } = await supabase.from('invoices').update({ nfe_status: 'cancelada' }).eq('id', invoiceId).select().single(); if (error) throw error; return data; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['nfse_invoices'] }); queryClient.invalidateQueries({ queryKey: ['invoices'] }); toast({ title: 'NFS-e cancelada' }); }, onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); } });

  const invoices = nfseInvoicesQuery.data || [];
  const stats = { pendente: invoices.filter(i => !i.nfe_status || i.nfe_status === 'rascunho' || i.nfe_status === 'pendente'), processando: invoices.filter(i => i.nfe_status === 'processando'), autorizada: invoices.filter(i => i.nfe_status === 'autorizada'), erro: invoices.filter(i => i.nfe_status === 'erro'), cancelada: invoices.filter(i => i.nfe_status === 'cancelada') };
  const sumValues = (items: typeof invoices) => items.reduce((sum, i) => sum + (i.valor || 0), 0);

  return { config: configQuery.data, isLoadingConfig: configQuery.isLoading, invoices, isLoadingInvoices: nfseInvoicesQuery.isLoading, stats, sumValues, saveConfig, emitNfse, cancelNfse };
}
