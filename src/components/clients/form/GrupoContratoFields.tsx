import { UseFormReturn } from "react-hook-form";
import { ClientFormData } from "./clientFormSchema";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEconomicGroups } from "@/hooks/useEconomicGroups";

interface GrupoContratoFieldsProps {
  form: UseFormReturn<ClientFormData>;
}

export function GrupoContratoFields({ form }: GrupoContratoFieldsProps) {
  const { groups, contractKeys } = useEconomicGroups();
  const selectedGroupId = form.watch("economic_group_id");
  const filteredKeys = selectedGroupId
    ? contractKeys.filter((k) => k.economic_group_id === selectedGroupId)
    : contractKeys;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="economic_group_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Grupo Econômico</FormLabel>
            <FormControl>
              <Select value={field.value || ""} onValueChange={(v) => { field.onChange(v || null); form.setValue("contract_key_id", undefined); }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="contract_key_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contrato-Chave</FormLabel>
            <FormControl>
              <Select value={field.value || ""} onValueChange={(v) => field.onChange(v || null)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {filteredKeys.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
