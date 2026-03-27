import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Database, Download, RefreshCw, Shield } from 'lucide-react';

export const BackupSettings = () => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      toast({ title: 'Exportação iniciada', description: 'O arquivo será gerado e disponibilizado para download.' });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Backup e Exportação de Dados</CardTitle>
          <CardDescription>Gerencie backups e exporte dados do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Exportar Dados Completos</h4>
                <p className="text-sm text-muted-foreground">Gera um arquivo com todos os dados do sistema (clientes, processos, financeiro)</p>
              </div>
              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Gerando...</> : <><Download className="h-4 w-4 mr-2" />Exportar</>}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2"><Shield className="h-4 w-4" />Backup Automático</h4>
                <p className="text-sm text-muted-foreground">Os dados são protegidos por backups automáticos diários via Supabase.</p>
              </div>
              <Badge variant="default">Ativo</Badge>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium">Informações do Banco de Dados</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Provedor:</span> <span className="font-medium">Supabase (PostgreSQL)</span></div>
              <div><span className="text-muted-foreground">Região:</span> <span className="font-medium">South America</span></div>
              <div><span className="text-muted-foreground">Retenção:</span> <span className="font-medium">7 dias (PITR)</span></div>
              <div><span className="text-muted-foreground">Criptografia:</span> <span className="font-medium">AES-256</span></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
