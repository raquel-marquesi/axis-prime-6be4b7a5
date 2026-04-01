import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportExportButton } from './ReportExportButton';
import {
  usePrazosAbertosReport,
  usePrazosPorProfissionalReport,
  usePrazosPorEquipeReport,
  usePrazosPorClienteReport,
} from '@/hooks/usePrazosReport';

export function PrazosReport() {
  return (
    <Tabs defaultValue="abertos" className="space-y-4">
      <TabsList className="bg-background border p-1 h-auto flex-wrap justify-start gap-1">
        <TabsTrigger value="abertos">Abertos/Atrasados</TabsTrigger>
        <TabsTrigger value="profissional">Por Profissional</TabsTrigger>
        <TabsTrigger value="equipe">Por Equipe</TabsTrigger>
        <TabsTrigger value="cliente">Por Cliente</TabsTrigger>
      </TabsList>
      <TabsContent value="abertos"><PrazosAbertosTab /></TabsContent>
      <TabsContent value="profissional"><PrazosPorProfissionalTab /></TabsContent>
      <TabsContent value="equipe"><PrazosPorEquipeTab /></TabsContent>
      <TabsContent value="cliente"><PrazosPorClienteTab /></TabsContent>
    </Tabs>
  );
}

function PrazosAbertosTab() {
  const { data, isLoading } = usePrazosAbertosReport();
  if (isLoading) return <Skeleton className="h-64" />;
  if (!data || data.length === 0) return <p className="text-center text-muted-foreground py-8">Nenhum prazo aberto encontrado.</p>;

  const atrasados = data.filter(d => d.status_prazo === 'Atrasado').length;
  const hoje = data.filter(d => d.status_prazo === 'Hoje').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Prazos Abertos</CardTitle>
          <p className="text-sm text-muted-foreground">{data.length} prazos · {atrasados} atrasados · {hoje} para hoje</p>
        </div>
        <ReportExportButton
          data={data}
          columns={[
            { key: 'processo', label: 'Processo' },
            { key: 'cliente', label: 'Cliente' },
            { key: 'ocorrencia', label: 'Ocorrência' },
            { key: 'data_prazo', label: 'Data Prazo' },
            { key: 'responsavel', label: 'Responsável' },
            { key: 'status_prazo', label: 'Status' },
            { key: 'dias_atraso', label: 'Dias Atraso' },
            { key: 'source', label: 'Origem' },
          ]}
          filename="prazos-abertos"
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Processo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Ocorrência</TableHead>
              <TableHead>Data Prazo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Dias Atraso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 200).map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.processo}</TableCell>
                <TableCell>{d.cliente}</TableCell>
                <TableCell className="max-w-[200px] truncate">{d.ocorrencia}</TableCell>
                <TableCell>{d.data_prazo}</TableCell>
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

function PrazosPorProfissionalTab() {
  const { data, isLoading } = usePrazosPorProfissionalReport();
  if (isLoading) return <Skeleton className="h-64" />;
  if (!data || data.length === 0) return <p className="text-center text-muted-foreground py-8">Nenhum dado encontrado.</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Prazos por Profissional</CardTitle>
        <ReportExportButton
          data={data}
          columns={[
            { key: 'name', label: 'Profissional' },
            { key: 'total', label: 'Total' },
            { key: 'concluidos', label: 'Concluídos' },
            { key: 'abertos', label: 'Abertos' },
            { key: 'atrasados', label: 'Atrasados' },
            { key: 'taxa_conclusao', label: 'Taxa Conclusão (%)', format: (v: number) => `${v}%` },
          ]}
          filename="prazos-por-profissional"
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Concluídos</TableHead>
              <TableHead className="text-right">Abertos</TableHead>
              <TableHead className="text-right">Atrasados</TableHead>
              <TableHead className="text-right">Taxa Conclusão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.name}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-right">{d.total}</TableCell>
                <TableCell className="text-right">{d.concluidos}</TableCell>
                <TableCell className="text-right">{d.abertos}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={d.atrasados > 0 ? 'destructive' : 'secondary'}>{d.atrasados}</Badge>
                </TableCell>
                <TableCell className="text-right">{d.taxa_conclusao}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PrazosPorEquipeTab() {
  const { data, isLoading } = usePrazosPorEquipeReport();
  if (isLoading) return <Skeleton className="h-64" />;
  if (!data || data.length === 0) return <p className="text-center text-muted-foreground py-8">Nenhum dado encontrado.</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Prazos por Equipe</CardTitle>
        <ReportExportButton
          data={data}
          columns={[
            { key: 'equipe', label: 'Equipe' },
            { key: 'total', label: 'Total' },
            { key: 'concluidos', label: 'Concluídos' },
            { key: 'abertos', label: 'Abertos' },
            { key: 'atrasados', label: 'Atrasados' },
          ]}
          filename="prazos-por-equipe"
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipe (Coordenador)</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Concluídos</TableHead>
              <TableHead className="text-right">Abertos</TableHead>
              <TableHead className="text-right">Atrasados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.equipe}>
                <TableCell className="font-medium">{d.equipe}</TableCell>
                <TableCell className="text-right">{d.total}</TableCell>
                <TableCell className="text-right">{d.concluidos}</TableCell>
                <TableCell className="text-right">{d.abertos}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={d.atrasados > 0 ? 'destructive' : 'secondary'}>{d.atrasados}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PrazosPorClienteTab() {
  const { data, isLoading } = usePrazosPorClienteReport();
  if (isLoading) return <Skeleton className="h-64" />;
  if (!data || data.length === 0) return <p className="text-center text-muted-foreground py-8">Nenhum dado encontrado.</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Prazos por Cliente</CardTitle>
        <ReportExportButton
          data={data}
          columns={[
            { key: 'cliente', label: 'Cliente' },
            { key: 'total', label: 'Total' },
            { key: 'concluidos', label: 'Concluídos' },
            { key: 'abertos', label: 'Abertos' },
            { key: 'atrasados', label: 'Atrasados' },
          ]}
          filename="prazos-por-cliente"
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Concluídos</TableHead>
              <TableHead className="text-right">Abertos</TableHead>
              <TableHead className="text-right">Atrasados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.cliente}>
                <TableCell className="font-medium">{d.cliente}</TableCell>
                <TableCell className="text-right">{d.total}</TableCell>
                <TableCell className="text-right">{d.concluidos}</TableCell>
                <TableCell className="text-right">{d.abertos}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={d.atrasados > 0 ? 'destructive' : 'secondary'}>{d.atrasados}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
