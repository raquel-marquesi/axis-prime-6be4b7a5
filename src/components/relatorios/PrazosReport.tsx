import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportExportButton } from './ReportExportButton';
import { PrazosReportFilters, EMPTY_FILTERS, type PrazosFilters } from './PrazosReportFilters';
import { usePrazosAbertosReport } from '@/hooks/usePrazosReport';
import { AlertTriangle, Clock, CalendarCheck, ListChecks } from 'lucide-react';

function KPICard({ label, value, total, icon, variant, onClick, active }: {
  label: string; value: number; total: number; icon: React.ReactNode;
  variant: 'destructive' | 'default' | 'secondary' | 'outline';
  onClick: () => void; active?: boolean;
}) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${active ? 'ring-2 ring-primary' : ''}`}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{pct}%</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PrazosReport() {
  const { data: rawData, isLoading } = usePrazosAbertosReport();
  const [filters, setFilters] = useState<PrazosFilters>(EMPTY_FILTERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);

  const availableProfissionais = useMemo(() => [...new Set((rawData || []).map(d => d.responsavel))].sort(), [rawData]);
  const availableClientes = useMemo(() => [...new Set((rawData || []).map(d => d.cliente))].sort(), [rawData]);
  const availableAreas = useMemo(() => [...new Set((rawData || []).map(d => d.area))].sort(), [rawData]);

  const filtered = useMemo(() => {
    if (!rawData) return [];
    return rawData.filter(d => {
      if (filters.dateFrom && d.data_prazo < format(filters.dateFrom, 'yyyy-MM-dd')) return false;
      if (filters.dateTo && d.data_prazo > format(filters.dateTo, 'yyyy-MM-dd')) return false;
      if (filters.profissionais.length && !filters.profissionais.includes(d.responsavel)) return false;
      if (filters.clientes.length && !filters.clientes.includes(d.cliente)) return false;
      if (filters.areas.length && !filters.areas.includes(d.area)) return false;
      if (filters.status.length && !filters.status.includes(d.status_prazo)) return false;
      if (kpiFilter && d.status_prazo !== kpiFilter) return false;
      return true;
    });
  }, [rawData, filters, kpiFilter]);

  const searched = useMemo(() => {
    if (!searchTerm) return filtered;
    const term = searchTerm.toLowerCase();
    return filtered.filter(d =>
      [d.processo, d.reclamante, d.reclamadas, d.cliente, d.ocorrencia, d.numero_pasta, d.responsavel]
        .some(field => field?.toLowerCase().includes(term))
    );
  }, [filtered, searchTerm]);

  const totalCount = filtered.length;
  const atrasados = filtered.filter(d => d.status_prazo === 'Atrasado').length;
  const hoje = filtered.filter(d => d.status_prazo === 'Hoje').length;
  const futuro = filtered.filter(d => d.status_prazo === 'Futuro').length;

  const toggleKpi = (status: string) => {
    setKpiFilter(prev => prev === status ? null : status);
  };

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total" value={totalCount} total={totalCount} icon={<ListChecks className="h-5 w-5 text-muted-foreground" />} variant="outline" onClick={() => setKpiFilter(null)} active={kpiFilter === null} />
        <KPICard label="Atrasados" value={atrasados} total={totalCount} icon={<AlertTriangle className="h-5 w-5 text-destructive" />} variant="destructive" onClick={() => toggleKpi('Atrasado')} active={kpiFilter === 'Atrasado'} />
        <KPICard label="Hoje" value={hoje} total={totalCount} icon={<Clock className="h-5 w-5 text-primary" />} variant="default" onClick={() => toggleKpi('Hoje')} active={kpiFilter === 'Hoje'} />
        <KPICard label="Futuro" value={futuro} total={totalCount} icon={<CalendarCheck className="h-5 w-5 text-muted-foreground" />} variant="secondary" onClick={() => toggleKpi('Futuro')} active={kpiFilter === 'Futuro'} />
      </div>

      {/* Filters */}
      <PrazosReportFilters
        filters={filters}
        onChange={f => { setKpiFilter(null); setFilters(f); }}
        availableProfissionais={availableProfissionais}
        availableClientes={availableClientes}
        availableAreas={availableAreas}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Tabs */}
      <Tabs defaultValue="abertos" className="space-y-4">
        <TabsList className="bg-background border p-1 h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="abertos">Abertos/Atrasados</TabsTrigger>
          <TabsTrigger value="profissional">Por Profissional</TabsTrigger>
          <TabsTrigger value="equipe">Por Equipe</TabsTrigger>
          <TabsTrigger value="cliente">Por Cliente</TabsTrigger>
        </TabsList>
        <TabsContent value="abertos"><PrazosAbertosTab data={searched} /></TabsContent>
        <TabsContent value="profissional"><PrazosPorProfissionalTab data={searched} /></TabsContent>
        <TabsContent value="equipe"><PrazosPorEquipeTab data={searched} /></TabsContent>
        <TabsContent value="cliente"><PrazosPorClienteTab data={searched} /></TabsContent>
      </Tabs>
    </div>
  );
}

type PrazoRow = {
  id: string; processo: string; numero_pasta: string; reclamante: string;
  reclamadas: string; area: string; cliente: string; ocorrencia: string;
  data_prazo: string; responsavel: string; status_prazo: string;
  dias_atraso: number; source: string;
};

function PrazosAbertosTab({ data }: { data: PrazoRow[] }) {
  if (data.length === 0) return <p className="text-center text-muted-foreground py-8">Nenhum prazo encontrado com os filtros aplicados.</p>;

  const exportColumns = [
    { key: 'processo', label: 'Processo' }, { key: 'numero_pasta', label: 'Nº Pasta' },
    { key: 'reclamante', label: 'Reclamante' }, { key: 'reclamadas', label: 'Reclamada(s)' },
    { key: 'area', label: 'Área' }, { key: 'cliente', label: 'Cliente' },
    { key: 'ocorrencia', label: 'Ocorrência' }, { key: 'data_prazo', label: 'Data Prazo' },
    { key: 'responsavel', label: 'Responsável' }, { key: 'status_prazo', label: 'Status' },
    { key: 'dias_atraso', label: 'Dias Atraso' }, { key: 'source', label: 'Origem' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Prazos Abertos</CardTitle>
          <p className="text-sm text-muted-foreground">{data.length} prazos</p>
        </div>
        <ReportExportButton data={data} columns={exportColumns} filename="prazos-abertos" />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Processo</TableHead><TableHead>Nº Pasta</TableHead>
              <TableHead>Reclamante</TableHead><TableHead>Reclamada(s)</TableHead>
              <TableHead>Área</TableHead><TableHead>Cliente</TableHead>
              <TableHead>Ocorrência</TableHead><TableHead>Data Prazo</TableHead>
              <TableHead>Responsável</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Dias Atraso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 200).map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium whitespace-nowrap">{d.processo}</TableCell>
                <TableCell>{d.numero_pasta}</TableCell>
                <TableCell className="max-w-[150px] truncate">{d.reclamante}</TableCell>
                <TableCell className="max-w-[150px] truncate">{d.reclamadas}</TableCell>
                <TableCell>{d.area}</TableCell>
                <TableCell className="max-w-[150px] truncate">{d.cliente}</TableCell>
                <TableCell className="max-w-[200px] truncate">{d.ocorrencia}</TableCell>
                <TableCell className="whitespace-nowrap">{d.data_prazo}</TableCell>
                <TableCell>{d.responsavel}</TableCell>
                <TableCell>
                  <Badge variant={d.status_prazo === 'Atrasado' ? 'destructive' : d.status_prazo === 'Hoje' ? 'default' : 'secondary'}>
                    {d.status_prazo}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{d.dias_atraso > 0 ? d.dias_atraso : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.length > 200 && <p className="text-sm text-muted-foreground text-center mt-2">Exibindo 200 de {data.length}. Exporte o CSV para ver todos.</p>}
      </CardContent>
    </Card>
  );
}

function PrazosPorProfissionalTab({ data }: { data: PrazoRow[] }) {
  const grouped = useMemo(() => {
    const groups: Record<string, { name: string; total: number; abertos: number; atrasados: number }> = {};
    for (const d of data) {
      if (!groups[d.responsavel]) groups[d.responsavel] = { name: d.responsavel, total: 0, abertos: 0, atrasados: 0 };
      groups[d.responsavel].total++;
      groups[d.responsavel].abertos++;
      if (d.status_prazo === 'Atrasado') groups[d.responsavel].atrasados++;
    }
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [data]);

  if (grouped.length === 0) return <p className="text-center text-muted-foreground py-8">Nenhum dado encontrado.</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Prazos por Profissional</CardTitle>
        <ReportExportButton data={grouped} columns={[
          { key: 'name', label: 'Profissional' }, { key: 'total', label: 'Total' },
          { key: 'abertos', label: 'Abertos' }, { key: 'atrasados', label: 'Atrasados' },
        ]} filename="prazos-por-profissional" />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Profissional</TableHead><TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Abertos</TableHead><TableHead className="text-right">Atrasados</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {grouped.map((d) => (
              <TableRow key={d.name}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-right">{d.total}</TableCell>
                <TableCell className="text-right">{d.abertos}</TableCell>
                <TableCell className="text-right"><Badge variant={d.atrasados > 0 ? 'destructive' : 'secondary'}>{d.atrasados}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PrazosPorEquipeTab({ data }: { data: PrazoRow[] }) {
  return <PrazosPorProfissionalTab data={data} />;
}

function PrazosPorClienteTab({ data }: { data: PrazoRow[] }) {
  const grouped = useMemo(() => {
    const groups: Record<string, { cliente: string; total: number; abertos: number; atrasados: number }> = {};
    for (const d of data) {
      if (!groups[d.cliente]) groups[d.cliente] = { cliente: d.cliente, total: 0, abertos: 0, atrasados: 0 };
      groups[d.cliente].total++;
      groups[d.cliente].abertos++;
      if (d.status_prazo === 'Atrasado') groups[d.cliente].atrasados++;
    }
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [data]);

  if (grouped.length === 0) return <p className="text-center text-muted-foreground py-8">Nenhum dado encontrado.</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Prazos por Cliente</CardTitle>
        <ReportExportButton data={grouped} columns={[
          { key: 'cliente', label: 'Cliente' }, { key: 'total', label: 'Total' },
          { key: 'abertos', label: 'Abertos' }, { key: 'atrasados', label: 'Atrasados' },
        ]} filename="prazos-por-cliente" />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Cliente</TableHead><TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Abertos</TableHead><TableHead className="text-right">Atrasados</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {grouped.map((d) => (
              <TableRow key={d.cliente}>
                <TableCell className="font-medium">{d.cliente}</TableCell>
                <TableCell className="text-right">{d.total}</TableCell>
                <TableCell className="text-right">{d.abertos}</TableCell>
                <TableCell className="text-right"><Badge variant={d.atrasados > 0 ? 'destructive' : 'secondary'}>{d.atrasados}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
