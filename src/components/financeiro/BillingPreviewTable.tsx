import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BillingPreviewItem } from '@/hooks/useBillingPreview';

interface BillingPreviewTableProps {
  items: BillingPreviewItem[];
  onToggleBillable: (itemId: string, isBillable: boolean) => void;
  isReadOnly?: boolean;
}

type FilterStatus = 'all' | 'billable' | 'duplicate' | 'excluded';

export const BillingPreviewTable: React.FC<BillingPreviewTableProps> = ({
  items,
  onToggleBillable,
  isReadOnly = false,
}) => {
  const [filter, setFilter] = useState<FilterStatus>('all');

  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'billable': return items.filter(i => i.is_billable);
      case 'duplicate': return items.filter(i => i.is_duplicate);
      case 'excluded': return items.filter(i => !i.is_billable);
      default: return items;
    }
  }, [items, filter]);

  const summary = useMemo(() => {
    const billable = items.filter(i => i.is_billable);
    const duplicates = items.filter(i => i.is_duplicate);
    const noType = items.filter(i => i.tipo_atividade === 'Não classificado');
    return {
      total: items.length,
      billableCount: billable.length,
      billableValue: billable.reduce((s, i) => s + Number(i.valor_total), 0),
      duplicateCount: duplicates.length,
      noTypeCount: noType.length,
    };
  }, [items]);

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="bg-muted rounded-md px-3 py-2">
          <span className="text-muted-foreground">Total:</span>{' '}
          <span className="font-semibold">{summary.total}</span>
        </div>
        <div className="bg-primary/10 rounded-md px-3 py-2">
          <span className="text-muted-foreground">Faturáveis:</span>{' '}
          <span className="font-semibold text-primary">{summary.billableCount}</span>
        </div>
        <div className="bg-destructive/10 rounded-md px-3 py-2">
          <span className="text-muted-foreground">Duplicatas:</span>{' '}
          <span className="font-semibold text-destructive">{summary.duplicateCount}</span>
        </div>
        <div className="bg-amber-500/10 rounded-md px-3 py-2">
          <span className="text-muted-foreground">Sem tipo:</span>{' '}
          <span className="font-semibold text-amber-600">{summary.noTypeCount}</span>
        </div>
        <div className="bg-primary/10 rounded-md px-3 py-2">
          <span className="text-muted-foreground">Valor faturável:</span>{' '}
          <span className="font-semibold text-primary">{formatCurrency(summary.billableValue)}</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Filtrar:</span>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="billable">Faturáveis</SelectItem>
            <SelectItem value="duplicate">Duplicatas</SelectItem>
            <SelectItem value="excluded">Excluídos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {!isReadOnly && <TableHead className="w-10 py-1 text-xs">Fat.</TableHead>}
              <TableHead className="py-1 text-xs">Processo</TableHead>
              <TableHead className="py-1 text-xs">Reclamante</TableHead>
              <TableHead className="py-1 text-xs">Tipo Atividade</TableHead>
              <TableHead className="py-1 text-xs">Data</TableHead>
              <TableHead className="py-1 text-xs">Qtd</TableHead>
              <TableHead className="py-1 text-xs text-right">Valor Unit.</TableHead>
              <TableHead className="py-1 text-xs text-right">Valor Total</TableHead>
              <TableHead className="py-1 text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id} className={`h-8 ${!item.is_billable ? 'opacity-50' : ''}`}>
                {!isReadOnly && (
                  <TableCell className="py-1">
                    <Checkbox
                      checked={item.is_billable}
                      onCheckedChange={(checked) => onToggleBillable(item.id, !!checked)}
                    />
                  </TableCell>
                )}
                <TableCell className="py-1 text-xs font-mono">{item.numero_processo || '—'}</TableCell>
                <TableCell className="py-1 text-xs max-w-[150px] truncate">{item.reclamante || '—'}</TableCell>
                <TableCell className="py-1 text-xs">
                  {item.tipo_atividade === 'Não classificado' ? (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">Sem tipo</Badge>
                  ) : (
                    <span className="truncate max-w-[120px] block">{item.tipo_atividade || '—'}</span>
                  )}
                </TableCell>
                <TableCell className="py-1 text-xs">
                  {item.data_atividade ? new Date(item.data_atividade + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                </TableCell>
                <TableCell className="py-1 text-xs text-center">{item.quantidade}</TableCell>
                <TableCell className="py-1 text-xs text-right">{formatCurrency(Number(item.valor_unitario))}</TableCell>
                <TableCell className="py-1 text-xs text-right font-semibold">{formatCurrency(Number(item.valor_total))}</TableCell>
                <TableCell className="py-1 text-xs">
                  {item.is_duplicate && (
                    <Badge variant="destructive" className="text-[10px]">Duplicata</Badge>
                  )}
                  {!item.is_billable && !item.is_duplicate && (
                    <Badge variant="secondary" className="text-[10px]">Excluído</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={isReadOnly ? 5 : 6} className="py-1 text-xs font-semibold">
                Total Faturável ({summary.billableCount} itens)
              </TableCell>
              <TableCell className="py-1 text-xs text-center font-semibold">
                {items.filter(i => i.is_billable).reduce((s, i) => s + i.quantidade, 0)}
              </TableCell>
              <TableCell className="py-1 text-xs text-right">—</TableCell>
              <TableCell className="py-1 text-xs text-right font-semibold text-primary">
                {formatCurrency(summary.billableValue)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};
