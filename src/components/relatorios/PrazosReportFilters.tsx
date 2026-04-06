import { useState, useMemo } from 'react';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Filter, X, Search, AlertTriangle, Clock, CalendarDays, CalendarRange } from 'lucide-react';
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
  searchTerm: string;
  onSearchChange: (term: string) => void;
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

type QuickFilter = 'atrasados' | 'hoje' | 'prox7dias' | 'estemes';

export function PrazosReportFilters({ filters, onChange, availableProfissionais, availableClientes, availableAreas, searchTerm, onSearchChange }: Props) {
  const [activeQuick, setActiveQuick] = useState<QuickFilter | null>(null);

  const toggleItem = (key: keyof Pick<PrazosFilters, 'profissionais' | 'clientes' | 'areas' | 'status'>, value: string) => {
    const arr = filters[key];
    onChange({ ...filters, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] });
  };

  const applyQuickFilter = (qf: QuickFilter) => {
    if (activeQuick === qf) {
      setActiveQuick(null);
      onChange(EMPTY_FILTERS);
      return;
    }
    setActiveQuick(qf);
    const now = new Date();
    switch (qf) {
      case 'atrasados':
        onChange({ ...EMPTY_FILTERS, status: ['Atrasado'] });
        break;
      case 'hoje':
        onChange({ ...EMPTY_FILTERS, status: ['Hoje'] });
        break;
      case 'prox7dias':
        onChange({ ...EMPTY_FILTERS, dateTo: addDays(now, 7) });
        break;
      case 'estemes':
        onChange({ ...EMPTY_FILTERS, dateFrom: startOfMonth(now), dateTo: endOfMonth(now) });
        break;
    }
  };

  const hasFilters = filters.dateFrom || filters.dateTo || filters.profissionais.length || filters.clientes.length || filters.areas.length || filters.status.length;

  const quickChips: { key: QuickFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'atrasados', label: 'Atrasados', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    { key: 'hoje', label: 'Hoje', icon: <Clock className="h-3.5 w-3.5" /> },
    { key: 'prox7dias', label: 'Próx. 7 dias', icon: <CalendarDays className="h-3.5 w-3.5" /> },
    { key: 'estemes', label: 'Este mês', icon: <CalendarRange className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-3">
      {/* Quick filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {quickChips.map(chip => (
          <Button
            key={chip.key}
            variant={activeQuick === chip.key ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => applyQuickFilter(chip.key)}
          >
            {chip.icon}
            {chip.label}
          </Button>
        ))}
      </div>

      {/* Search + detailed filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar processo, reclamante, cliente..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>

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
              onSelect={d => { setActiveQuick(null); onChange({ ...filters, dateFrom: d }); }}
              locale={ptBR}
              captionLayout="dropdown-buttons"
              fromYear={2020}
              toYear={2030}
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
              onSelect={d => { setActiveQuick(null); onChange({ ...filters, dateTo: d }); }}
              locale={ptBR}
              captionLayout="dropdown-buttons"
              fromYear={2020}
              toYear={2030}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <MultiSelectPopover
          label="Profissional"
          selected={filters.profissionais}
          options={availableProfissionais}
          onToggle={v => { setActiveQuick(null); toggleItem('profissionais', v); }}
        />

        <MultiSelectPopover
          label="Cliente"
          selected={filters.clientes}
          options={availableClientes}
          onToggle={v => { setActiveQuick(null); toggleItem('clientes', v); }}
        />

        <MultiSelectPopover
          label="Área"
          selected={filters.areas}
          options={availableAreas}
          onToggle={v => { setActiveQuick(null); toggleItem('areas', v); }}
        />

        <MultiSelectPopover
          label="Status"
          selected={filters.status}
          options={['Atrasado', 'Hoje', 'Futuro']}
          onToggle={v => { setActiveQuick(null); toggleItem('status', v); }}
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={() => { setActiveQuick(null); onChange(EMPTY_FILTERS); }}>
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
