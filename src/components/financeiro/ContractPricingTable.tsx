import { useState } from 'react';
import { useContractPricing } from '@/hooks/useContractPricing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface ContractPricingTableProps {
  clientId?: string;
  clienteNome?: string;
  compact?: boolean;
}

export function ContractPricingTable({ clientId, clienteNome, compact }: ContractPricingTableProps) {
  const { pricings: contracts, isLoading } = useContractPricing(clientId ? { clientId } : undefined);
  const [openClients, setOpenClients] = useState<Set<string>>(new Set());

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (contracts.length === 0) return <p className="text-center text-muted-foreground py-4 text-sm">Nenhum contrato encontrado.</p>;

  // Group by cliente_nome
  const grouped = new Map<string, typeof contracts>();
  for (const c of contracts) {
    const key = (c.cliente_nome || '').toUpperCase();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(c);
  }

  const toggle = (key: string) => {
    setOpenClients(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const entries = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-4">
      {!compact && clienteNome && (
        <h3 className="text-lg font-semibold">Contratos de Precificação — {clienteNome}</h3>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map(([key, items]) => {
          const isOpen = openClients.has(key);
          const totalValor = items.reduce((s, c) => s + (c.valor ?? 0), 0);
          const ativos = items.filter(c => c.is_active).length;
          const displayName = items[0]?.cliente_nome || key;

          return (
            <Collapsible key={key} open={isOpen} onOpenChange={() => toggle(key)} className={isOpen ? 'sm:col-span-2 lg:col-span-3' : ''}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{displayName}</CardTitle>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">{items.length} contrato{items.length > 1 ? 's' : ''}</Badge>
                      <span>{ativos} ativo{ativos !== 1 ? 's' : ''}</span>
                    </div>
                    {totalValor > 0 && <p className="text-sm font-medium mt-1">{fmt(totalValor)}</p>}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                        {items.map(c => (
                          <TableRow key={c.id}>
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
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
