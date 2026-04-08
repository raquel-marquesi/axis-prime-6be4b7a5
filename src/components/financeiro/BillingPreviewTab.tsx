import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, CheckCircle, Loader2, ArrowLeft, ChevronsUpDown, Check, Users } from 'lucide-react';
import { useClientsSafe, ClientSafe } from '@/hooks/useClientsSafe';
import { useBillingPreview } from '@/hooks/useBillingPreview';
import { useBranches } from '@/hooks/useBranches';
import { useEconomicGroups } from '@/hooks/useEconomicGroups';
import { BillingPreviewTable } from './BillingPreviewTable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const BillingPreviewTab: React.FC = () => {
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [referenceMonth, setReferenceMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  const { clients, isLoading: loadingClients } = useClientsSafe();
  const { activeBranches } = useBranches();
  const { groups } = useEconomicGroups();
  const { previews, isLoadingPreviews, items, isLoadingItems, generatePreview, updateItemBillable, approvePreview } = useBillingPreview(activePreviewId || undefined);

  // Fetch client_branches map
  const { data: clientBranchesMap = {} } = useQuery({
    queryKey: ['client-branches-map'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_branches').select('client_id, branch_id');
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const row of data || []) {
        if (!map[row.client_id]) map[row.client_id] = [];
        map[row.client_id].push(row.branch_id);
      }
      return map;
    },
  });

  // Filter clients based on group and branch
  const filteredClients = useMemo(() => {
    let list = clients;
    if (selectedGroupId) {
      list = list.filter(c => c.economic_group_id === selectedGroupId);
    }
    if (selectedBranchId) {
      list = list.filter(c => (clientBranchesMap[c.id] || []).includes(selectedBranchId));
    }
    return list;
  }, [clients, selectedGroupId, selectedBranchId, clientBranchesMap]);

  const clientLabel = (c: ClientSafe) => c.razao_social || c.nome || c.nome_fantasia || 'Sem nome';

  const toggleClient = (clientId: string) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
  };

  const selectAllFiltered = () => {
    const allIds = filteredClients.map(c => c.id);
    const allSelected = allIds.every(id => selectedClientIds.includes(id));
    if (allSelected) {
      setSelectedClientIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedClientIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const allFilteredSelected = filteredClients.length > 0 && filteredClients.every(c => selectedClientIds.includes(c.id));

  const selectionLabel = useMemo(() => {
    if (selectedClientIds.length === 0) return 'Buscar cliente...';
    if (selectedClientIds.length === 1) {
      const c = clients.find(cl => cl.id === selectedClientIds[0]);
      return c ? clientLabel(c) : '1 cliente';
    }
    return `${selectedClientIds.length} clientes selecionados`;
  }, [selectedClientIds, clients]);

  const handleGenerate = async () => {
    if (selectedClientIds.length === 0 || !referenceMonth) return;
    if (selectedClientIds.length === 1) {
      generatePreview.mutate(
        { clientId: selectedClientIds[0], referenceMonth },
        { onSuccess: (data) => setActivePreviewId(data.id) }
      );
      return;
    }
    // Batch generate for multiple clients
    setGeneratingBatch(true);
    let success = 0;
    let fail = 0;
    for (const clientId of selectedClientIds) {
      try {
        await new Promise<void>((resolve, reject) => {
          generatePreview.mutate(
            { clientId, referenceMonth },
            { onSuccess: () => { success++; resolve(); }, onError: () => { fail++; resolve(); } }
          );
        });
      } catch {
        fail++;
      }
    }
    setGeneratingBatch(false);
    toast.success(`${success} pré-relatório(s) gerado(s)${fail > 0 ? `, ${fail} erro(s)` : ''}`);
  };

  const activePreview = previews.find(p => p.id === activePreviewId);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Rascunho</Badge>;
      case 'approved': return <Badge className="bg-primary text-primary-foreground">Aprovado</Badge>;
      case 'invoiced': return <Badge className="bg-emerald-600 text-primary-foreground">Faturado</Badge>;
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
            {/* Grupo Econômico filter */}
            <div className="space-y-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">Grupo Econômico</label>
              <Select value={selectedGroupId} onValueChange={(v) => { setSelectedGroupId(v === '_all' ? '' : v); setSelectedClientIds([]); }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filial filter */}
            <div className="space-y-1 min-w-[180px]">
              <label className="text-xs text-muted-foreground">Filial</label>
              <Select value={selectedBranchId} onValueChange={(v) => { setSelectedBranchId(v === '_all' ? '' : v); setSelectedClientIds([]); }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas</SelectItem>
                  {activeBranches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client multi-select combobox */}
            <div className="space-y-1 min-w-[320px]">
              <label className="text-xs text-muted-foreground">Cliente(s)</label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboboxOpen} className="h-9 w-full justify-between font-normal">
                    <span className="truncate">{selectionLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Digite para buscar..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {/* Select all filtered */}
                        <CommandItem
                          onSelect={selectAllFiltered}
                          className="font-medium border-b mb-1"
                        >
                          <Checkbox
                            checked={allFilteredSelected}
                            className="mr-2 h-4 w-4"
                          />
                          <Users className="mr-2 h-4 w-4" />
                          Selecionar todos ({filteredClients.length})
                        </CommandItem>
                        {filteredClients.map(c => {
                          const group = c.economic_group_id ? groups.find(g => g.id === c.economic_group_id) : null;
                          const isSelected = selectedClientIds.includes(c.id);
                          return (
                            <CommandItem
                              key={c.id}
                              value={`${c.razao_social || ''} ${c.nome || ''} ${c.nome_fantasia || ''}`}
                              onSelect={() => toggleClient(c.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                className="mr-2 h-4 w-4"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm">{clientLabel(c)}</span>
                                {group && <span className="text-xs text-muted-foreground">{group.nome}</span>}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Month */}
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
              disabled={selectedClientIds.length === 0 || !referenceMonth || generatePreview.isPending || generatingBatch}
              className="gap-2"
            >
              {(generatePreview.isPending || generatingBatch) ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {selectedClientIds.length > 1 ? `Gerar ${selectedClientIds.length} Pré-Relatórios` : 'Gerar Pré-Relatório'}
            </Button>
          </div>

          {/* Selected clients chips */}
          {selectedClientIds.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selectedClientIds.map(id => {
                const c = clients.find(cl => cl.id === id);
                if (!c) return null;
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20 transition-colors"
                    onClick={() => toggleClient(id)}
                  >
                    {clientLabel(c)} ×
                  </Badge>
                );
              })}
            </div>
          )}
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