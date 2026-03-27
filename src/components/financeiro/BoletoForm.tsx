import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBillingContacts } from '@/hooks/useBillingContacts';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (data: { billing_contact_id: string | null; amount: number; due_date: string; status: string; barcode: string | null; our_number: string | null; pdf_url: string | null; sent_at: string | null; paid_at: string | null; notes: string | null; }) => void; }

export function BoletoForm({ open, onOpenChange, onSubmit }: Props) {
  const { contacts } = useBillingContacts();
  const [contactId, setContactId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [ourNumber, setOurNumber] = useState('');
  const [notes, setNotes] = useState('');
  const handleSubmit = () => { onSubmit({ billing_contact_id: contactId || null, amount: Number(amount), due_date: dueDate, status: 'generated', barcode: null, our_number: ourNumber || null, pdf_url: null, sent_at: null, paid_at: null, notes: notes || null }); setContactId(''); setAmount(''); setDueDate(''); setOurNumber(''); setNotes(''); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Gerar Boleto</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label>Contato de Faturamento</Label><Select value={contactId} onValueChange={setContactId}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{contacts.map(c => (<SelectItem key={c.id} value={c.id}>{c.razao_social} - {c.cpf_cnpj}</SelectItem>))}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-4"><div><Label>Valor (R$)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div><div><Label>Vencimento</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div></div>
        <div><Label>Nosso Número</Label><Input value={ourNumber} onChange={e => setOurNumber(e.target.value)} /></div>
        <div><Label>Observações</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSubmit} disabled={!amount || !dueDate}>Gerar</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}