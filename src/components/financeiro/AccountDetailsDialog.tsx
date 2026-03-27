import { useState } from 'react';
import { Building2, Mail, Phone, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Account } from '@/hooks/useAccounts';
import { BillingContactsTable } from '@/components/financeiro/BillingContactsTable';
import { BillingContactFormDialog } from '@/components/financeiro/BillingContactFormDialog';

const statusColors: Record<string, string> = { ativa: 'bg-green-500/10 text-green-700 border-green-200', inativa: 'bg-red-500/10 text-red-700 border-red-200', prospeccao: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' };
const statusLabels: Record<string, string> = { ativa: 'Ativa', inativa: 'Inativa', prospeccao: 'Prospecção' };

export function AccountDetailsDialog({ open, onOpenChange, account }: { open: boolean; onOpenChange: (open: boolean) => void; account: Account }) {
  const [contactFormOpen, setContactFormOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />{account.nome}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-muted-foreground">Tipo de Conta</p><p className="font-medium">{account.tipo_conta || '—'}</p></div>
            <div><p className="text-sm text-muted-foreground">Status</p><Badge variant="outline" className={statusColors[account.status]}>{statusLabels[account.status] || account.status}</Badge></div>
          </div>
          <Separator />
          <div><p className="text-sm font-medium mb-2">Responsável Principal</p><div className="space-y-1"><p className="text-sm">{account.responsavel_nome}</p>{account.responsavel_email && <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {account.responsavel_email}</p>}{account.responsavel_telefone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {account.responsavel_telefone}</p>}</div></div>
          {account.observacoes && <><Separator /><div><p className="text-sm font-medium mb-1">Observações</p><p className="text-sm text-muted-foreground">{account.observacoes}</p></div></>}
          <Separator />
          <div><div className="flex items-center justify-between mb-3"><p className="text-sm font-medium">Contatos de Faturamento</p><Button size="sm" variant="outline" onClick={() => setContactFormOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo Contato</Button></div><BillingContactsTable accountId={account.id} /></div>
        </div>
        <BillingContactFormDialog open={contactFormOpen} onOpenChange={setContactFormOpen} accountId={account.id} accountName={account.nome} />
      </DialogContent>
    </Dialog>
  );
}