import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TablePaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: { singular: string; plural: string };
}

// Build the list of page numbers to render. Returns numbers and 'ellipsis' markers.
function buildPageList(current: number, total: number): (number | 'ellipsis-l' | 'ellipsis-r')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }
  const items: (number | 'ellipsis-l' | 'ellipsis-r')[] = [];
  const windowSize = 1; // pages on each side of current
  const start = Math.max(1, current - windowSize);
  const end = Math.min(total - 2, current + windowSize);

  items.push(0);
  if (start > 1) items.push('ellipsis-l');
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 2) items.push('ellipsis-r');
  items.push(total - 1);
  return items;
}

export function TablePagination({
  page,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
  itemLabel = { singular: 'item', plural: 'itens' },
}: TablePaginationProps) {
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;
  const pages = buildPageList(page, totalPages);
  const label = totalCount === 1 ? itemLabel.singular : itemLabel.plural;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">
          Página {page + 1} de {totalPages} · {totalCount} {label}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Por página:</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(0)}
          disabled={!canPrev}
          aria-label="Primeira página"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={!canPrev}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {pages.map((p, idx) => {
          if (p === 'ellipsis-l' || p === 'ellipsis-r') {
            return (
              <span key={`${p}-${idx}`} className="px-2 text-muted-foreground text-sm select-none">
                …
              </span>
            );
          }
          const isActive = p === page;
          return (
            <Button
              key={p}
              variant={isActive ? 'default' : 'outline'}
              size="icon"
              className={cn('h-8 w-8 tabular-nums text-xs', isActive && 'pointer-events-none')}
              onClick={() => onPageChange(p)}
              aria-label={`Página ${p + 1}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {p + 1}
            </Button>
          );
        })}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={!canNext}
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={!canNext}
          aria-label="Última página"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default TablePagination;
