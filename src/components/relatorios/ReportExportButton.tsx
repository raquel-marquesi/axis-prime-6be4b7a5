import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ReportExportButtonProps {
  data: any[];
  columns: { key: string; label: string; format?: (v: any) => string }[];
  filename: string;
  title?: string;
}

export function ReportExportButton({ data, columns, filename, title }: ReportExportButtonProps) {
  const handleExport = () => {
    const bom = '\uFEFF';
    const header = columns.map(c => c.label).join(';');
    const rows = data.map(row =>
      columns.map(col => {
        const val = row[col.key];
        const formatted = col.format ? col.format(val) : (val ?? '');
        return `"${String(formatted).replace(/"/g, '""')}"`;
      }).join(';')
    );
    const csv = `${bom}${header}\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      Exportar
    </Button>
  );
}
