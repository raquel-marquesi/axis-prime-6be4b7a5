import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenses } from '@/hooks/useExpenses';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useExpenseSplits } from '@/hooks/useExpenseSplits';
import { Plus, Trash2 } from 'lucide-react';

const CATEGORIAS = [
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'salarios', label: 'Salários' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'outros', label: 'Outros' },
];

interface SplitRow { centro_custo: string; percentual: string; }

export function ExpenseFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { createExpense } = useExpenses();
  const { costCenters } = useCostCenters();
  const { saveSplits } = useExpenseSplits();
  const [enableRateio, setEnableRateio] = useState(false);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [form, setForm] = useState({ descricao: '', fornecedor: '', categoria: 'outros', valor: '', data_vencimento: '', numero_documento: '', observacoes: '' });

  const addSplit = () => setSplits(prev => [...prev, { centro_custo: '', percentual: '' }]);
  const removeSplit = (i: number) => setSplits(prev => prev.filter((_, idx) => idx !== i));
  const updateSplit = (i: number, field: keyof SplitRow, value: string) => setSplits(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const totalPercent = splits.reduce((s, r) => s + (parseFloat(r.percentual) || 0), 0);
  const valorNum = parseFloat(form.valor) || 0;

  const handleSubmit = () => {
    if (!form.descricao || !form.data_vencimento || !form.valor) return;
    if (enableRateio && splits.length > 0 && Math.abs(totalPercent - 100) > 0.01) return;
    createExpense.mutate({
      descricao: form.descricao, fornecedor: form.fornecedor || null, categoria: form.categoria, valor: valorNum,
      data_vencimento: form.data_vencimento, data_pagamento: null, status: 'pendente', numero_documento: form.numero_documento || null,
      observacoes: form.observacoes || null, account_id: null, status_aprovacao: 'pendente', aprovado_por: null, aprovado_em: null,
    }, {
      onSuccess: (data: any) => {
        if (enableRateio && splits.length > 0 && data?.id) {
          saveSplits.mutate({ expenseId: data.id, splits: splits.map(s => ({ centro_custo: s.centro_custo, percentual: parseFloat(s.percentual) || 0, valor: (valorNum * (parseFloat(s.percentual) || 0)) / 100 })) });
        }
        onOpenChange(false);
        setForm({ descricao: '', fornecedor: '', categoria: 'outros', valor: '', data_vencimento: '', numero_documento: '', observacoes: '' });
        setSplits([]); setEnableRateio(false);
      }
    });
  };

  const activeCCs = costCenters.filter(cc => cc.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} /></div>
            <div><Label>Categoria</Label><Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor *</Label><Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} /></div>
            <div><Label>Vencimento *</Label><Input type="date" value={form.data_vencimento} onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} /></div>
          </div>
          <div><Label>Nº Documento</Label><Input value={form.numero_documento} onChange={e => setForm(f => ({ ...f, numero_documento: e.target.value }))} /></div>
          <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Rateio entre Centros de Custo</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => { setEnableRateio(!enableRateio); if (!enableRateio && splits.length === 0) addSplit(); }}>
                {enableRateio ? 'Desabilitar' : 'Habilitar'}
              </Button>
            </div>
            {enableRateio && (
              <div className="mt-2 space-y-2">
                {splits.map((s, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select value={s.centro_custo} onValueChange={v => updateSplit(i, 'centro_custo', v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
                        <SelectContent>{activeCCs.map(cc => <SelectItem key={cc.id} value={cc.codigo}>{cc.codigo} — {cc.descricao}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="w-20"><Input className="h-9" type="number" placeholder="%" value={s.percentual} onChange={e => updateSplit(i, 'percentual', e.target.value)} /></div>
                    <div className="w-28 text-sm text-muted-foreground pt-1">R$ {((valorNum * (parseFloat(s.percentual) || 0)) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeSplit(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" size="sm" onClick={addSplit}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
                  <span className={`text-sm ${Math.abs(totalPercent - 100) > 0.01 ? 'text-destructive' : 'text-muted-foreground'}`}>Total: {totalPercent.toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSubmit} disabled={createExpense.isPending}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}