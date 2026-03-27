import { UseFormReturn } from 'react-hook-form';
import { ClientFormData } from './clientFormSchema';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

interface OutrosTabProps { form: UseFormReturn<ClientFormData>; }

export function OutrosTab({ form }: OutrosTabProps) {
  return (
    <div className="space-y-4">
      <FormField control={form.control} name="observacoes" render={({ field }) => (<FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Observações gerais sobre o cliente" className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
    </div>
  );
}
