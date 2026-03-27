import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useBillingContacts, BillingContact } from '@/hooks/useBillingContacts';
import { useCostCenters } from '@/hooks/useCostCenters';
const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const billingContactSchema = z.object({ razao_social: z.string().min(1, 'Razão social é obrigatória'), cpf_cnpj: z.string().min(1, 'CPF/CNPJ é obrigatório'), tipo_documento: z.string().default('cnpj'), endereco_cep: z.string().optional(), endereco_logradouro: z.string().optional(), endereco_numero: z.string().optional(), endereco_complemento: z.string().optional(), endereco_bairro: z.string().optional(), endereco_cidade: z.string().optional(), endereco_estado: z.string().optional(), email_nf: z.string().email('E-mail inválido').optional().or(z.literal('')), inscricao_estadual: z.string().optional(), inscricao_municipal: z.string().optional(), nome_caso_projeto: z.string().optional(), centro_custo: z.string().optional() });
type BillingContactFormValues = z.infer<typeof billingContactSchema>;
interface Props { open: boolean; onOpenChange: (open: boolean) => void; accountId: string; accountName: string; contact?: BillingContact | null; }
export function BillingContactFormDialog({ open, onOpenChange, accountId, accountName, contact }: Props) {
  const { createContact, updateContact } = useBillingContacts(accountId);
  const { costCenters } = useCostCenters();
  const activeCCs = costCenters.filter(cc => cc.is_active);
  const isEditing = !!contact;
  const form = useForm<BillingContactFormValues>({ resolver: zodResolver(billingContactSchema), defaultValues: { razao_social: contact?.razao_social || '', cpf_cnpj: contact?.cpf_cnpj || '', tipo_documento: contact?.tipo_documento || 'cnpj', endereco_cep: contact?.endereco_cep || '', endereco_logradouro: contact?.endereco_logradouro || '', endereco_numero: contact?.endereco_numero || '', endereco_complemento: contact?.endereco_complemento || '', endereco_bairro: contact?.endereco_bairro || '', endereco_cidade: contact?.endereco_cidade || '', endereco_estado: contact?.endereco_estado || '', email_nf: contact?.email_nf || '', inscricao_estadual: contact?.inscricao_estadual || '', inscricao_municipal: contact?.inscricao_municipal || '', nome_caso_projeto: contact?.nome_caso_projeto || '', centro_custo: contact?.centro_custo || '' } });
  const onSubmit = async (values: BillingContactFormValues) => {
    const payload = { account_id: accountId, razao_social: values.razao_social, cpf_cnpj: values.cpf_cnpj, tipo_documento: values.tipo_documento || null, endereco_cep: values.endereco_cep || null, endereco_logradouro: values.endereco_logradouro || null, endereco_numero: values.endereco_numero || null, endereco_complemento: values.endereco_complemento || null, endereco_bairro: values.endereco_bairro || null, endereco_cidade: values.endereco_cidade || null, endereco_estado: values.endereco_estado || null, email_nf: values.email_nf || null, inscricao_estadual: values.inscricao_estadual || null, inscricao_municipal: values.inscricao_municipal || null, nome_caso_projeto: values.nome_caso_projeto || null, centro_custo: values.centro_custo || null, is_active: true };
    if (isEditing && contact) { await updateContact.mutateAsync({ id: contact.id, ...payload }); } else { await createContact.mutateAsync(payload); }
    onOpenChange(false);
  };
  return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{isEditing ? 'Editar Contato de Faturamento' : 'Novo Contato de Faturamento'}</DialogTitle><p className="text-sm text-muted-foreground">Vinculado à conta: <strong>{accountName}</strong></p></DialogHeader><Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormField control={form.control} name="razao_social" render={({ field }) => (<FormItem><FormLabel>Razão Social / Nome *</FormLabel><FormControl><Input placeholder="Nome para constar na NF" {...field} /></FormControl><FormMessage /></FormItem>)} />
    <div className="grid grid-cols-2 gap-4">
      <FormField control={form.control} name="tipo_documento" render={({ field }) => (<FormItem><FormLabel>Tipo Documento</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="cpf">CPF</SelectItem><SelectItem value="cnpj">CNPJ</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="cpf_cnpj" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ *</FormLabel><FormControl><Input placeholder="Documento fiscal" {...field} /></FormControl><FormMessage /></FormItem>)} />
    </div>
    <FormField control={form.control} name="email_nf" render={({ field }) => (<FormItem><FormLabel>E-mail para NF</FormLabel><FormControl><Input type="email" placeholder="financeiro@empresa.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
    <div className="grid grid-cols-3 gap-4">
      <FormField control={form.control} name="endereco_cep" render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>)} />
      <div className="col-span-2"><FormField control={form.control} name="endereco_logradouro" render={({ field }) => (<FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <FormField control={form.control} name="endereco_numero" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
      <div className="col-span-2"><FormField control={form.control} name="endereco_complemento" render={({ field }) => (<FormItem><FormLabel>Complemento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <FormField control={form.control} name="endereco_bairro" render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="endereco_cidade" render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="endereco_estado" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger></FormControl><SelectContent>{ESTADOS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormField control={form.control} name="inscricao_estadual" render={({ field }) => (<FormItem><FormLabel>Inscrição Estadual</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="inscricao_municipal" render={({ field }) => (<FormItem><FormLabel>Inscrição Municipal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormField control={form.control} name="nome_caso_projeto" render={({ field }) => (<FormItem><FormLabel>Nome do Caso/Projeto</FormLabel><FormControl><Input placeholder="Opcional" {...field} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="centro_custo" render={({ field }) => (<FormItem><FormLabel>Centro de Custo</FormLabel><Select onValueChange={(v) => field.onChange(v === 'none' ? '' : v)} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Nenhum</SelectItem>{activeCCs.map(cc => (<SelectItem key={cc.id} value={cc.codigo}>{cc.codigo} — {cc.descricao}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
    </div>
    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={createContact.isPending || updateContact.isPending}>{isEditing ? 'Salvar' : 'Criar Contato'}</Button></DialogFooter>
  </form></Form></DialogContent></Dialog>);
}