import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAccounts } from '@/hooks/useAccounts';
import { useBillingContacts } from '@/hooks/useBillingContacts';
import { useInvoices } from '@/hooks/useInvoices';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

export function BatchInvoiceDialog({ open, onOpenChange }: Props) {
  const { accounts } = useAccounts();
  const { createInvoice } = useInvoices();
  const createBatchInvoices = { mutateAsync: async (invoices: any[]) => { for (const inv of invoices) { await createInvoice.mutateAsync(inv); } }, isPending: createInvoice.isPending };
  const [accountId, setAccountId] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [valor, setValor] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [descricao, setDescricao] = useState('');
  const { contacts } = useBillingContacts(accountId || undefined);
  const activeContacts = contacts.filter(c => c.is_active);
  const toggleContact = (id: string) => { setSelectedContacts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  const handleSubmit = async () => {
    if (!accountId || selectedContacts.length === 0) return;
    const invoices = selectedContacts.map(contactId => { const contact = contacts.find(c => c.id === contactId); return { account_id: accountId, billing_contact_id: contactId, client_id: null, centro_custo: contact?.centro_custo || null, numero_nf: null, valor: valor ? parseFloat(valor) : null, data_emissao: dataEmissao || null, data_vencimento: dataVencimento || null, status: 'rascunho', descricao: descricao || null }; });
    await createBatchInvoices.mutateAsync(invoices); handleClose();
  };
  const handleClose = () => { setAccountId(''); setSelectedContacts([]); setValor(''); setDataEmissao(''); setDataVencimento(''); setDescricao(''); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Faturamento em Lote</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label>1. Selecionar Conta *</Label><Select value={accountId} onValueChange={v => { setAccountId(v); setSelectedContacts([]); }}><SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger><SelectContent>{accounts.filter(a => a.status === 'ativa').map(a => (<SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>))}</SelectContent></Select></div>
        {accountId && (<div><Label>2. Selecionar Contatos de Faturamento *</Label>{activeContacts.length === 0 ? (<p className="text-sm text-muted-foreground mt-1">Nenhum contato ativo para esta conta.</p>) : (<div className="space-y-2 mt-2 max-h-40 overflow-y-auto border rounded-lg p-3">{activeContacts.map(c => (<label key={c.id} className="flex items-center gap-2 cursor-pointer"><Checkbox checked={selectedContacts.includes(c.id)} onCheckedChange={() => toggleContact(c.id)} /><span className="text-sm">{c.razao_social} — {c.cpf_cnpj}</span></label>))}</div>)}<p className="text-xs text-muted-foreground mt-1">{selectedContacts.length} selecionado(s)</p></div>)}
        <div className="grid grid-cols-2 gap-4"><div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} /></div><div><Label>Data Emissão</Label><Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} /></div></div>
        <div><Label>Data Vencimento</Label><Input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} /></div>
        <div><Label>Descrição</Label><Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição comum para todas as faturas..." /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={handleClose}>Cancelar</Button><Button onClick={handleSubmit} disabled={createBatchInvoices.isPending || selectedContacts.length === 0}>Gerar {selectedContacts.length} Fatura(s)</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}