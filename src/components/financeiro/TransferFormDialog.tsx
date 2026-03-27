import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTreasury } from '@/hooks/useTreasury';
import { useBankAccountsConfig } from '@/hooks/useBankAccountsConfig';

export function TransferFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { createEntry } = useTreasury();
  const { bankAccounts } = useBankAccountsConfig();
  const activeAccounts = bankAccounts.filter(a => a.is_active);
  const [form, setForm] = useState({ tipo: 'entrada', bank_account_id: '', conta_destino_id: '', valor: '', data_movimentacao: '', descricao: '' });

  const handleSubmit = () => {
    if (!form.bank_account_id || !form.valor || !form.data_movimentacao) return;
    if (form.tipo === 'transferencia' && !form.conta_destino_id) return;
    createEntry.mutate({ tipo: form.tipo, bank_account_id: form.bank_account_id, conta_destino_id: form.tipo === 'transferencia' ? form.conta_destino_id : null, valor: parseFloat(form.valor), data_movimentacao: form.data_movimentacao, descricao: form.descricao || null }, {
      onSuccess: () => { onOpenChange(false); setForm({ tipo: 'entrada', bank_account_id: '', conta_destino_id: '', valor: '', data_movimentacao: '', descricao: '' }); }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Tipo *</Label><Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem><SelectItem value="transferencia">Transferência</SelectItem></SelectContent></Select></div>
          <div><Label>{form.tipo === 'transferencia' ? 'Conta Origem *' : 'Conta *'}</Label><Select value={form.bank_account_id} onValueChange={v => setForm(f => ({ ...f, bank_account_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger><SelectContent>{activeAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.banco} - Ag {a.agencia} / CC {a.conta}</SelectItem>)}</SelectContent></Select></div>
          {form.tipo === 'transferencia' && (<div><Label>Conta Destino *</Label><Select value={form.conta_destino_id} onValueChange={v => setForm(f => ({ ...f, conta_destino_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione a conta destino" /></SelectTrigger><SelectContent>{activeAccounts.filter(a => a.id !== form.bank_account_id).map(a => <SelectItem key={a.id} value={a.id}>{a.banco} - Ag {a.agencia} / CC {a.conta}</SelectItem>)}</SelectContent></Select></div>)}
          <div className="grid grid-cols-2 gap-3"><div><Label>Valor *</Label><Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} /></div><div><Label>Data *</Label><Input type="date" value={form.data_movimentacao} onChange={e => setForm(f => ({ ...f, data_movimentacao: e.target.value }))} /></div></div>
          <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSubmit} disabled={createEntry.isPending}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}