import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAccounts } from '@/hooks/useAccounts';
import { useBillingContacts } from '@/hooks/useBillingContacts';
import { useInvoices } from '@/hooks/useInvoices';
import { useClientsSafe } from '@/hooks/useClientsSafe';

const invoiceSchema = z.object({
  client_id: z.string().optional(),
  account_id: z.string().min(1, 'Selecione uma conta'),
  billing_contact_id: z.string().min(1, 'Selecione um contato de faturamento'),
  numero_nf: z.string().optional(),
  valor: z.string().optional(),
  data_emissao: z.string().optional(),
  data_vencimento: z.string().optional(),
  status: z.string().default('rascunho'),
  descricao: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export function InvoiceFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { accounts } = useAccounts();
  const { createInvoice } = useInvoices();
  const { clients } = useClients();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { client_id: '', account_id: '', billing_contact_id: '', numero_nf: '', valor: '', data_emissao: '', data_vencimento: '', status: 'rascunho', descricao: '' },
  });

  const watchedAccountId = form.watch('account_id');
  const watchedContactId = form.watch('billing_contact_id');
  const watchedClientId = form.watch('client_id');
  const { contacts } = useBillingContacts(watchedAccountId || undefined);
  const selectedContact = contacts.find((c: any) => c.id === watchedContactId);
  const selectedClient = clients.find((c: any) => c.id === watchedClientId);

  const handleOpenChange = (isOpen: boolean) => { if (!isOpen) form.reset(); onOpenChange(isOpen); };

  const onSubmit = async (values: InvoiceFormValues) => {
    await createInvoice.mutateAsync({
      account_id: values.account_id, billing_contact_id: values.billing_contact_id, client_id: values.client_id || null,
      centro_custo: selectedContact?.centro_custo || null, numero_nf: values.numero_nf || null, valor: values.valor ? parseFloat(values.valor) : null,
      data_emissao: values.data_emissao || null, data_vencimento: values.data_vencimento || null, status: values.status, descricao: values.descricao || null,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo Faturamento</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="client_id" render={({ field }) => (
              <FormItem><FormLabel>Cliente (opcional)</FormLabel><Select onValueChange={(v) => field.onChange(v === 'none' ? '' : v)} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder="Vincular a um cliente..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Nenhum</SelectItem>{clients.filter((c: any) => c.is_active).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.tipo === 'juridica' ? (c.razao_social || c.nome_fantasia) : c.nome}</SelectItem>)}</SelectContent></Select></FormItem>
            )} />

            {selectedClient && (selectedClient.contrato_objeto || selectedClient.contrato_condicoes_faturamento) && (
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Dados do Contrato</p>
                {selectedClient.contrato_objeto && <p className="text-sm"><strong>Objeto:</strong> {selectedClient.contrato_objeto}</p>}
                {selectedClient.contrato_condicoes_faturamento && <p className="text-sm"><strong>Condições:</strong> {selectedClient.contrato_condicoes_faturamento}</p>}
              </div>
            )}

            <FormField control={form.control} name="account_id" render={({ field }) => (
              <FormItem><FormLabel>Conta *</FormLabel><Select onValueChange={(v) => { field.onChange(v); form.setValue('billing_contact_id', ''); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione a conta principal" /></SelectTrigger></FormControl><SelectContent>{accounts.filter((a: any) => a.status === 'ativa').map((a: any) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )} />

            {watchedAccountId && (
              <FormField control={form.control} name="billing_contact_id" render={({ field }) => (
                <FormItem><FormLabel>Contato de Faturamento *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione para quem faturar" /></SelectTrigger></FormControl><SelectContent>{contacts.filter((c: any) => c.is_active).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.razao_social} — {c.cpf_cnpj}</SelectItem>)}</SelectContent></Select>{contacts.length === 0 && <p className="text-xs text-muted-foreground">Nenhum contato de faturamento cadastrado.</p>}<FormMessage /></FormItem>
              )} />
            )}

            {selectedContact && (
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Dados fiscais (automático)</p>
                <p className="text-sm"><strong>Razão Social:</strong> {selectedContact.razao_social}</p>
                <p className="text-sm"><strong>{selectedContact.tipo_documento?.toUpperCase()}:</strong> {selectedContact.cpf_cnpj}</p>
                {selectedContact.email_nf && <p className="text-sm"><strong>E-mail NF:</strong> {selectedContact.email_nf}</p>}
                {selectedContact.centro_custo && <p className="text-sm"><strong>Centro de Custo:</strong> {selectedContact.centro_custo}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="numero_nf" render={({ field }) => (<FormItem><FormLabel>Número da NF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="valor" render={({ field }) => (<FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="data_emissao" render={({ field }) => (<FormItem><FormLabel>Data Emissão</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="data_vencimento" render={({ field }) => (<FormItem><FormLabel>Data Vencimento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="rascunho">Rascunho</SelectItem><SelectItem value="emitida">Emitida</SelectItem><SelectItem value="paga">Paga</SelectItem><SelectItem value="cancelada">Cancelada</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="descricao" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descrição do serviço..." {...field} /></FormControl><FormMessage /></FormItem>)} />

            <DialogFooter><Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={createInvoice.isPending}>Criar Faturamento</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}