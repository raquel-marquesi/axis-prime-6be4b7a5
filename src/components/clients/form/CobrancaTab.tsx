import { UseFormReturn } from 'react-hook-form';
import { ClientFormData } from './clientFormSchema';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CobrancaTabProps { form: UseFormReturn<ClientFormData>; }

export function CobrancaTab({ form }: CobrancaTabProps) {
  const aplicarGrossup = form.watch('aplicar_grossup');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Datas de Faturamento</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="dia_emissao_nf" render={({ field }) => (
            <FormItem>
              <FormLabel>Dia de Emissão NF</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={31} placeholder="Ex: 15" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dia_vencimento" render={({ field }) => (
            <FormItem>
              <FormLabel>Dia de Vencimento</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={31} placeholder="Ex: 25" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Lembrete de Cobrança</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="billing_reminder_enabled" render={({ field }) => (
            <FormItem className="flex items-center gap-3 rounded-lg border border-border p-3">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">Ativar lembrete</FormLabel>
            </FormItem>
          )} />
          <FormField control={form.control} name="billing_reminder_days" render={({ field }) => (
            <FormItem>
              <FormLabel>Dias antes do vencimento</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={60} placeholder="Ex: 5" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Gross-up</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="aplicar_grossup" render={({ field }) => (
            <FormItem className="flex items-center gap-3 rounded-lg border border-border p-3">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">Aplicar Gross-up</FormLabel>
            </FormItem>
          )} />
          {aplicarGrossup && (
            <FormField control={form.control} name="tipo_grossup" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Gross-up</FormLabel>
                <FormControl>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iss">ISS</SelectItem>
                      <SelectItem value="iss_pis_cofins">ISS + PIS/COFINS</SelectItem>
                      <SelectItem value="completo">Completo (todos impostos)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>
      </div>
    </div>
  );
}
