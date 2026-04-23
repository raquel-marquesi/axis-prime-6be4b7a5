import { useState, useMemo, useEffect } from 'react';

import { useProcesses, Process } from '@/hooks/useProcesses';
import { useNavigate } from 'react-router-dom';
import ProcessesTable from '@/components/processes/ProcessesTable';
import ProcessDetailsDialog from '@/components/processes/ProcessDetailsDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AreaProcesso } from '@/hooks/useProcesses';

type FilterType = 'all' | 'individual' | 'coletiva';
type FilterArea = 'all' | AreaProcesso;

const PAGE_SIZE = 50;

export default function Processes() {
  const [page, setPage] = useState(0);
  const { processes, totalCount, isLoading } = useProcesses({ page, pageSize: PAGE_SIZE });
  const navigate = useNavigate();
  const { isAdmin, hasRole } = useAuth();
  const canEditProcesses = isAdmin() || hasRole('socio') || hasRole('coordenador') || hasRole('lider');

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterArea, setFilterArea] = useState<FilterArea>('all');
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Reset to first page when filters change to avoid confusing partial results.
  useEffect(() => {
    setPage(0);
  }, [search, filterType, filterArea]);

  const filteredProcesses = useMemo(() => {
    return processes.filter((process) => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search ||
        process.numero_processo?.toLowerCase().includes(searchLower) ||
        process.reclamante_nome?.toLowerCase().includes(searchLower) ||
        process.reclamante_cpf?.includes(search) ||
        process.client?.nome?.toLowerCase().includes(searchLower) ||
        process.client?.razao_social?.toLowerCase().includes(searchLower) ||
        process.codigo_externo?.toLowerCase().includes(searchLower) ||
        String(process.numero_pasta).includes(search) ||
        process.drive_folder_id?.toLowerCase().includes(searchLower);
      const matchesType = filterType === 'all' || process.tipo_acao === filterType;
      const matchesArea = filterArea === 'all' || process.area === filterArea;
      return matchesSearch && matchesType && matchesArea;
    });
  }, [processes, search, filterType, filterArea]);

  const handleViewDetails = (process: Process) => { setSelectedProcess(process); setIsDetailsOpen(true); };
  const handleEdit = (process: Process) => { navigate(`/processos/${process.id}`); };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Processos</h1>
            <p className="text-sm text-muted-foreground">Gerencie processos trabalhistas</p>
          </div>
          {canEditProcesses && (
            <Button onClick={() => navigate('/processos/novo')}>
              <Plus className="w-4 h-4 mr-2" />Novo Processo
            </Button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por número, parte ou cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterArea} onValueChange={(v) => setFilterArea(v as FilterArea)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Área" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                <SelectItem value="trabalhista">Trabalhista</SelectItem>
                <SelectItem value="civel">Cível</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="coletiva">Coletiva</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            <ProcessesTable processes={filteredProcesses} onViewDetails={handleViewDetails} onEdit={handleEdit} />
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages} · {totalCount} processo{totalCount === 1 ? '' : 's'}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={!canPrev}>
                  <ChevronLeft className="w-4 h-4 mr-1" />Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!canNext}>
                  Próxima<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      <ProcessDetailsDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen} process={selectedProcess} onEdit={handleEdit} />
    </>
  );
}
