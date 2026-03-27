import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useClientContacts, ClientContact, ContactFormData, ContatoTipo } from '@/hooks/useClients';
import { formatPhone } from '@/lib/validators';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cargo: z.string().optional(),
  tipo: z.enum(['principal', 'financeiro', 'alternativo']),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contact?: ClientContact | null;
}

export function ContactFormDialog({ open, onOpenChange, clientId, contact }: ContactFormDialogProps) {
  const { createContact, updateContact } = useClientContacts(clientId);
  const isEditing = !!contact;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', cargo: '', tipo: 'principal', telefone: '', celular: '', email: '' },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        nome: contact.nome, cargo: contact.cargo || '', tipo: contact.tipo as ContatoTipo,
        telefone: contact.telefone ? formatPhone(contact.telefone) : '',
        celular: contact.celular ? formatPhone(contact.celular) : '', email: contact.email || '',
      });
    } else {
      form.reset({ nome: '', cargo: '', tipo: 'principal', telefone: '', celular: '', email: '' });
    }
  }, [contact, form, open]);

  const onSubmit = async (data: FormData) => {
    const submitData: ContactFormData = {
      client_id: clientId, nome: data.nome, cargo: data.cargo || undefined,
      tipo: data.tipo as ContatoTipo,
      telefone: data.telefone?.replace(/\D/g, '') || undefined,
      celular: data.celular?.replace(/\D/g, '') || undefined, email: data.email || undefined,
    };
    try {
      if (isEditing && contact) { await updateContact.mutateAsync({ ...submitData, id: contact.id }); }
      else { await createContact.mutateAsync(submitData); }
      onOpenChange(false);
    } catch (error) { /* handled by mutation */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEditing ? 'Editar Contato' : 'Novo Contato'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input placeholder="Nome do contato" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem><FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="principal">Principal</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="alternativo">Alternativo</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cargo" render={({ field }) => (
                <FormItem><FormLabel>Cargo</FormLabel><FormControl><Input placeholder="Cargo" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="telefone" render={({ field }) => (
                <FormItem><FormLabel>Telefone</FormLabel><FormControl>
                  <Input placeholder="(00) 0000-0000" {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} />
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="celular" render={({ field }) => (
                <FormItem><FormLabel>Celular</FormLabel><FormControl>
                  <Input placeholder="(00) 00000-0000" {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} />
                </FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={createContact.isPending || updateContact.isPending}>
                {(createContact.isPending || updateContact.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
