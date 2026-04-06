import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PrazosFilters {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  profissionais: string[];
  clientes: string[];
  areas: string[];
  status: string[];
}

export const EMPTY_FILTERS: PrazosFilters = {
  dateFrom: undefined,
  dateTo: undefined,
  profissionais: [],
  clientes: [],
  areas: [],
  status: [],
};

interface Props {
  filters: PrazosFilters;
  onChange: (f: PrazosFilters) => void;
  availableProfissionais: string[];
  availableClientes: string[];
  availableAreas: string[];
}

function MultiSelectPopover({
  label,
  selected,
  options,
  onToggle,
}: {
  label: string;
  selected: string[];
  options: string[];
  onToggle: (v: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => (search ? options.filter(o => o.toLowerCase().includes(search.toLowerCase())) : options),
    [options, search],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1">
          <Filter className="h-3.5 w-3.5" />
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-2 h-8 text-sm"
        />
        <ScrollArea className="max-h-52">
          <div className="space-y-1">
            {filtered.map(opt => (
              <label key={opt} className="flex items-center gap-2 px-1 py-1 text-sm cursor-pointer hover:bg-accent rounded">
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={() => onToggle(opt)}
                />
                <span className="truncate">{opt}</span>
              </label>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhum resultado</p>}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function PrazosReportFilters({ filters, onChange, availableProfissionais, availableClientes, availableAreas }: Props) {
  const toggleItem = (key: keyof Pick<PrazosFilters, 'profissionais' | 'clientes' | 'areas' | 'status'>, value: string) => {
    const arr = filters[key];
    onChange({ ...filters, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] });
  };

  const hasFilters = filters.dateFrom || filters.dateTo || filters.profissionais.length || filters.clientes.length || filters.areas.length || filters.status.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date From */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn('h-9 gap-1', filters.dateFrom && 'border-primary')}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yyyy') : 'Data início'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateFrom}
            onSelect={d => onChange({ ...filters, dateFrom: d })}
            locale={ptBR}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Date To */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn('h-9 gap-1', filters.dateTo && 'border-primary')}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {filters.dateTo ? format(filters.dateTo, 'dd/MM/yyyy') : 'Data fim'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateTo}
            onSelect={d => onChange({ ...filters, dateTo: d })}
            locale={ptBR}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <MultiSelectPopover
        label="Profissional"
        selected={filters.profissionais}
        options={availableProfissionais}
        onToggle={v => toggleItem('profissionais', v)}
      />

      <MultiSelectPopover
        label="Cliente"
        selected={filters.clientes}
        options={availableClientes}
        onToggle={v => toggleItem('clientes', v)}
      />

      <MultiSelectPopover
        label="Área"
        selected={filters.areas}
        options={availableAreas}
        onToggle={v => toggleItem('areas', v)}
      />

      <MultiSelectPopover
        label="Status"
        selected={filters.status}
        options={['Atrasado', 'Hoje', 'Futuro']}
        onToggle={v => toggleItem('status', v)}
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={() => onChange(EMPTY_FILTERS)}>
          <X className="h-3.5 w-3.5" /> Limpar
        </Button>
      )}
    </div>
  );
}
