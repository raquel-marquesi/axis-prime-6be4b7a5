import { useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useProcessSearch, useProcessById, type Process } from '@/hooks/useProcesses';

interface ProcessComboboxProps {
  value: string | null | undefined;
  onChange: (id: string, process: Process | null) => void;
  placeholder?: string;
  emptyLabel?: string;
  allowClear?: boolean;
  className?: string;
}

export function ProcessCombobox({
  value,
  onChange,
  placeholder = 'Selecione um processo',
  emptyLabel = 'Nenhum',
  allowClear = false,
  className,
}: ProcessComboboxProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');

  const { data: results = [], isFetching } = useProcessSearch(term);
  const { data: selected } = useProcessById(value || null);

  const label = selected
    ? `${selected.numero_pasta} - ${selected.numero_processo} · ${selected.reclamante_nome}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground', className)}
        >
          <span className="truncate text-left">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Buscar por número ou reclamante..."
              value={term}
              onValueChange={setTerm}
              className="border-0 focus:ring-0"
            />
          </div>
          <CommandList>
            {term.trim().length < 2 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Digite ao menos 2 caracteres para buscar
              </div>
            ) : isFetching ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Buscando...</div>
            ) : (
              <>
                <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
                <CommandGroup>
                  {allowClear && (
                    <CommandItem
                      value="__none__"
                      onSelect={() => {
                        onChange('', null);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                      <span className="text-muted-foreground">{emptyLabel}</span>
                    </CommandItem>
                  )}
                  {results.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={p.id}
                      onSelect={() => {
                        onChange(p.id, p);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', value === p.id ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">
                        <span className="tabular-nums tracking-wide text-xs mr-2">{p.numero_pasta}</span>
                        {p.numero_processo} - {p.reclamante_nome}
                        {p.tipo_acao === 'coletiva' && (
                          <span className="ml-2 text-xs text-primary">(Coletiva)</span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
