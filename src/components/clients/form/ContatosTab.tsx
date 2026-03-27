import { UseFormReturn, UseFieldArrayReturn } from 'react-hook-form';
import { ClientFormData } from './clientFormSchema';
import { formatPhone } from '@/lib/validators';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface ContatosTabProps { form: UseFormReturn<ClientFormData>; fieldArray: UseFieldArrayReturn<ClientFormData, 'contacts'>; }

export function ContatosTab({ form, fieldArray }: ContatosTabProps) {
  const { fields, append, remove } = fieldArray;
  return (
    <div className="space-y-4">
      <div className="p-3 rounded-md bg-muted/50 border border-border mb-4"><p className="text-sm text-muted-foreground">⚠️ É obrigatório ter pelo menos um contato principal.</p></div>
      {fields.map((field, index) => (
        <div key={field.id} className="p-4 border border-border rounded-lg space-y-4 relative">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Contato {index + 1}</h4>
            {fields.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}><Trash2 className="w-4 h-4" /></Button>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name={`contacts.${index}.nome`} render={({ field }) => (<FormItem><FormLabel>Nome *</FormLabel><FormControl><Input placeholder="Nome do contato" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name={`contacts.${index}.tipo`} render={({ field }) => (<FormItem><FormLabel>Tipo *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent><SelectItem value="principal">Principal</SelectItem><SelectItem value="financeiro">Financeiro</SelectItem><SelectItem value="alternativo">Alternativo</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name={`contacts.${index}.email`} render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name={`contacts.${index}.telefone`} render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(00) 0000-0000" {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" className="w-full" onClick={() => append({ nome: '', tipo: 'alternativo', email: '' })}><Plus className="w-4 h-4 mr-2" />Adicionar Contato</Button>
    </div>
  );
}
