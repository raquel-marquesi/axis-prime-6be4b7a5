import { UseFormReturn } from 'react-hook-form';
import { ClientFormData } from './clientFormSchema';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ContratoTabProps { form: UseFormReturn<ClientFormData>; client?: any; isEditing: boolean; onTipoChange?: (tipo: 'fisica' | 'juridica') => void; }

export function ContratoTab({ form }: ContratoTabProps) {
  return (
    <div className="space-y-4">
      <FormField control={form.control} name="contrato_objeto" render={({ field }) => (<FormItem><FormLabel>Objeto do Contrato</FormLabel><FormControl><Textarea placeholder="Descreva o objeto do contrato" className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="contrato_data_inicio" render={({ field }) => (<FormItem><FormLabel>Data de Início</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="contrato_data_vencimento" render={({ field }) => (<FormItem><FormLabel>Data de Vencimento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
      </div>
      <FormField control={form.control} name="contrato_condicoes_faturamento" render={({ field }) => (<FormItem><FormLabel>Condições de Faturamento</FormLabel><FormControl><Textarea placeholder="Condições de faturamento" className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
    </div>
  );
}
