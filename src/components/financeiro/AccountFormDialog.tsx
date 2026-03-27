import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAccounts, Account } from '@/hooks/useAccounts';

const accountSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo_conta: z.string().optional(),
  responsavel_nome: z.string().min(1, 'Responsável é obrigatório'),
  responsavel_email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  responsavel_telefone: z.string().optional(),
  status: z.string().default('ativa'),
  observacoes: z.string().optional(),
});
type AccountFormValues = z.infer<typeof accountSchema>;
const TIPOS_CONTA = ['Escritório de Advocacia', 'Corporativo', 'Agência', 'Pessoa Física', 'Outro'];

interface AccountFormDialogProps { open: boolean; onOpenChange: (open: boolean) => void; account?: Account | null; }

export function AccountFormDialog({ open, onOpenChange, account }: AccountFormDialogProps) {
  const { createAccount, updateAccount } = useAccounts();
  const isEditing = !!account;
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { nome: account?.nome || '', tipo_conta: account?.tipo_conta || '', responsavel_nome: account?.responsavel_nome || '', responsavel_email: account?.responsavel_email || '', responsavel_telefone: account?.responsavel_telefone || '', status: account?.status || 'ativa', observacoes: account?.observacoes || '' },
  });
  const onSubmit = async (values: AccountFormValues) => {
    const payload = { nome: values.nome, tipo_conta: values.tipo_conta || null, responsavel_nome: values.responsavel_nome, responsavel_email: values.responsavel_email || null, responsavel_telefone: values.responsavel_telefone || null, status: values.status, observacoes: values.observacoes || null, client_id: account?.client_id || null, branch_id: account?.branch_id || null };
    if (isEditing) { await updateAccount.mutateAsync({ id: account.id, ...payload }); } else { await createAccount.mutateAsync(payload); }
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEditing ? 'Editar Conta' : 'Nova Conta'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nome" render={({ field }) => (<FormItem><FormLabel>Nome da Conta *</FormLabel><FormControl><Input placeholder="Ex: MCM Advogados" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tipo_conta" render={({ field }) => (<FormItem><FormLabel>Tipo de Conta</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{TIPOS_CONTA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="ativa">Ativa</SelectItem><SelectItem value="inativa">Inativa</SelectItem><SelectItem value="prospeccao">Prospecção</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="responsavel_nome" render={({ field }) => (<FormItem><FormLabel>Responsável Principal *</FormLabel><FormControl><Input placeholder="Nome do contato" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="responsavel_email" render={({ field }) => (<FormItem><FormLabel>E-mail do Responsável</FormLabel><FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="responsavel_telefone" render={({ field }) => (<FormItem><FormLabel>Telefone do Responsável</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="observacoes" render={({ field }) => (<FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Observações adicionais..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={createAccount.isPending || updateAccount.isPending}>{isEditing ? 'Salvar' : 'Criar Conta'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}