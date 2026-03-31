import { useContractPricing } from '@/hooks/useContractPricing';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface PrecificacaoTabProps { clientId?: string | null; }

export function PrecificacaoTab({ clientId }: PrecificacaoTabProps) {
  const { pricings, isLoading } = useContractPricing({ clientId: clientId || undefined });

  if (!clientId) {
    return <p className="text-sm text-muted-foreground py-4">Salve o cliente primeiro para gerenciar precificação.</p>;
  }

  if (isLoading) return <Skeleton className="h-32" />;

  const fmt = (v: number | null) => v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Valores contratuais vinculados a este cliente. Gerencie pela página Financeiro → Faturamento → Precificação.
      </p>
      {pricings.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Nenhum valor contratual cadastrado.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Tipo Cálculo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricings.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.contrato}</TableCell>
                  <TableCell>{p.tipo_calculo}</TableCell>
                  <TableCell className="tabular-nums">{fmt(p.valor)}</TableCell>
                  <TableCell className="tabular-nums">{p.percentual != null ? `${p.percentual}%` : '—'}</TableCell>
                  <TableCell>{(p as any).modalidade || '—'}</TableCell>
                  <TableCell><Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
