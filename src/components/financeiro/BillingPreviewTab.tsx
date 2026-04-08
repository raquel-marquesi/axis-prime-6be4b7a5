import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useClientsSafe } from '@/hooks/useClientsSafe';
import { useBillingPreview } from '@/hooks/useBillingPreview';
import { BillingPreviewTable } from './BillingPreviewTable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const BillingPreviewTab: React.FC = () => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [referenceMonth, setReferenceMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  const { data: clients = [], isLoading: loadingClients } = useClientsSafe();
  const { previews, isLoadingPreviews, items, isLoadingItems, generatePreview, updateItemBillable, approvePreview } = useBillingPreview(activePreviewId || undefined);

  const handleGenerate = () => {
    if (!selectedClientId || !referenceMonth) return;
    generatePreview.mutate(
      { clientId: selectedClientId, referenceMonth },
      { onSuccess: (data) => setActivePreviewId(data.id) }
    );
  };

  const activePreview = previews.find(p => p.id === activePreviewId);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Rascunho</Badge>;
      case 'approved': return <Badge className="bg-primary text-primary-foreground">Aprovado</Badge>;
      case 'invoiced': return <Badge className="bg-emerald-600 text-white">Faturado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pré-Faturamento
          </CardTitle>
          <CardDescription>
            Gere um relatório de produção para validar antes de emitir a fatura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1 min-w-[250px]">
              <label className="text-xs text-muted-foreground">Cliente</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome || c.razao_social || c.nome_fantasia || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Mês de Referência</label>
              <Input
                type="month"
                value={referenceMonth}
                onChange={(e) => setReferenceMonth(e.target.value)}
                className="h-9 w-[180px]"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!selectedClientId || !referenceMonth || generatePreview.isPending}
              className="gap-2"
            >
              {generatePreview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Gerar Pré-Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active preview detail */}
      {activePreviewId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setActivePreviewId(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-lg">
                    Pré-Relatório — {activePreview?.reference_month
                      ? format(new Date(activePreview.reference_month + 'T12:00:00'), 'MMMM yyyy', { locale: ptBR })
                      : ''}
                  </CardTitle>
                  <CardDescription>
                    {clients.find((c: any) => c.id === activePreview?.client_id)?.razao_social ||
                      clients.find((c: any) => c.id === activePreview?.client_id)?.nome || ''}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {activePreview && statusLabel(activePreview.status)}
                {activePreview?.status === 'draft' && (
                  <Button
                    onClick={() => approvePreview.mutate(activePreviewId)}
                    disabled={approvePreview.isPending}
                    className="gap-2"
                  >
                    {approvePreview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Aprovar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingItems ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <BillingPreviewTable
                items={items}
                onToggleBillable={(itemId, isBillable) =>
                  updateItemBillable.mutate({ itemId, isBillable })
                }
                isReadOnly={activePreview?.status !== 'draft'}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* List of existing previews */}
      {!activePreviewId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pré-Relatórios Gerados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPreviews ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : previews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum pré-relatório gerado ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {previews.map((preview) => {
                  const client = clients.find((c: any) => c.id === preview.client_id);
                  return (
                    <div
                      key={preview.id}
                      className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setActivePreviewId(preview.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm font-medium">
                            {client?.razao_social || client?.nome || 'Cliente não encontrado'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(preview.reference_month + 'T12:00:00'), 'MMMM yyyy', { locale: ptBR })} • {preview.total_items} itens
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">
                          {Number(preview.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        {statusLabel(preview.status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
