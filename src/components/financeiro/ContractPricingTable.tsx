import { useContractPricing } from '@/hooks/useContractPricing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface ContractPricingTableProps {
  clientId?: string;
  clienteNome?: string;
  compact?: boolean;
}

export function ContractPricingTable({ clientId, clienteNome, compact }: ContractPricingTableProps) {
  const { contracts, isLoading } = useContractPricing(clientId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (contracts.length === 0) return <p className="text-center text-muted-foreground py-4 text-sm">Nenhum contrato encontrado.</p>;

  const Wrapper = compact ? 'div' : Card;
  const Header = compact ? 'div' : CardHeader;
  const Content = compact ? 'div' : CardContent;

  return (
    <div>
      {!compact && <CardHeader><CardTitle>Contratos de Precificação{clienteNome ? ` — ${clienteNome}` : ''}</CardTitle></CardHeader>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Contrato</TableHead>
            <TableHead>Tipo Cálculo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">Andamento</TableHead>
            <TableHead className="text-right">Encerrado</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.cliente_nome}</TableCell>
              <TableCell>{c.contrato}</TableCell>
              <TableCell><Badge variant="outline">{c.tipo_calculo}</Badge></TableCell>
              <TableCell className="text-right">{c.valor ? fmt(c.valor) : '—'}</TableCell>
              <TableCell className="text-right">{c.percentual ? `${c.percentual}%` : '—'}</TableCell>
              <TableCell className="text-right">{c.proc_andamento ?? 0}</TableCell>
              <TableCell className="text-right">{c.proc_encerrado ?? 0}</TableCell>
              <TableCell><Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
