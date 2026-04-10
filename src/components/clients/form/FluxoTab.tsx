import { UseFormReturn } from 'react-hook-form';
import { ClientFormData } from './clientFormSchema';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Zap, Monitor, Bell } from 'lucide-react';

interface FluxoTabProps {
  form: UseFormReturn<ClientFormData>;
}

export function FluxoTab({ form }: FluxoTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-yellow-500" />
              <h3 className="font-medium">Recebimento de Solicitações</h3>
            </div>
            
            <FormField
              control={form.control}
              name="metodo_recepcao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método Preferencial</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>Monitoramento de E-mail (Padrão)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="portal_api">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          <span>Integração via Portal/API</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="manual">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          <span>Lançamento Manual</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Define como as novas demandas chegam ao escritório para este cliente.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" />
                <h3 className="font-medium">Gestão de Contrato</h3>
              </div>
              <FormField
                control={form.control}
                name="monitorar_contrato"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <p className="text-sm text-muted-foreground">
              Se habilitado, o Axis Prime irá monitorar a data de vencimento do contrato deste cliente e notificará o financeiro e lideranças 30 dias antes da expiração.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
