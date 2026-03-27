import { UseFormReturn } from 'react-hook-form';
import { ClientFormData, ESTADOS_BR } from './clientFormSchema';
import { formatCEP } from '@/lib/validators';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface EnderecoTabProps { form: UseFormReturn<ClientFormData>; }

export function EnderecoTab({ form }: EnderecoTabProps) {
  return (
    <div className="space-y-4">
      <div className="p-3 rounded-md bg-muted/50 border border-border mb-4"><p className="text-sm text-muted-foreground">⚠️ O preenchimento do endereço é obrigatório.</p></div>
      <FormField control={form.control} name="cep" render={({ field }) => (<FormItem><FormLabel>CEP *</FormLabel><FormControl><Input placeholder="00000-000" {...field} onChange={(e) => field.onChange(formatCEP(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3"><FormField control={form.control} name="logradouro" render={({ field }) => (<FormItem><FormLabel>Logradouro *</FormLabel><FormControl><Input placeholder="Rua, Avenida, etc." {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
        <FormField control={form.control} name="numero" render={({ field }) => (<FormItem><FormLabel>Número *</FormLabel><FormControl><Input placeholder="Nº" {...field} /></FormControl><FormMessage /></FormItem>)} />
      </div>
      <FormField control={form.control} name="complemento" render={({ field }) => (<FormItem><FormLabel>Complemento</FormLabel><FormControl><Input placeholder="Apto, Sala, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
      <div className="grid grid-cols-3 gap-4">
        <FormField control={form.control} name="bairro" render={({ field }) => (<FormItem><FormLabel>Bairro *</FormLabel><FormControl><Input placeholder="Bairro" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="cidade" render={({ field }) => (<FormItem><FormLabel>Cidade *</FormLabel><FormControl><Input placeholder="Cidade" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="estado" render={({ field }) => (<FormItem><FormLabel>Estado *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger></FormControl><SelectContent>{ESTADOS_BR.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
      </div>
    </div>
  );
}
