import { UseFormReturn } from 'react-hook-form';
import { ClientFormData } from './clientFormSchema';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface DadosTabProps {
  form: UseFormReturn<ClientFormData>;
  tipo: 'fisica' | 'juridica';
  isCheckingDuplicate: boolean;
  onDocumentChange: (value: string, field: 'cpf' | 'cnpj') => void;
}

export function DadosTab({ form, tipo, isCheckingDuplicate, onDocumentChange }: DadosTabProps) {
  if (tipo === 'fisica') {
    return (
      <div className="space-y-4">
        <FormField control={form.control} name="nome" render={({ field }) => (
          <FormItem><FormLabel>Nome Completo *</FormLabel><FormControl><Input placeholder="Nome do cliente" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="cpf" render={({ field }) => (
          <FormItem><FormLabel>CPF *</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} onChange={(e) => onDocumentChange(e.target.value, 'cpf')} /></FormControl><FormMessage /></FormItem>
        )} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <FormField control={form.control} name="razao_social" render={({ field }) => (
        <FormItem><FormLabel>Razão Social *</FormLabel><FormControl><Input placeholder="Razão Social" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="cnpj" render={({ field }) => (
        <FormItem><FormLabel>CNPJ *</FormLabel><FormControl><Input placeholder="00.000.000/0000-00" {...field} onChange={(e) => onDocumentChange(e.target.value, 'cnpj')} /></FormControl><FormMessage /></FormItem>
      )} />
    </div>
  );
}
