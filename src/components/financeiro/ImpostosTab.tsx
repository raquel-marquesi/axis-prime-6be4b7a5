import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaxSimulator } from './TaxSimulator';
import { TaxInfoCard } from './TaxInfoCard';
import { useTaxRules } from '@/hooks/useTaxRules';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function ImpostosTab() {
  const { rules, isLoading } = useTaxRules();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="simulador" className="space-y-4">
        <TabsList>
          <TabsTrigger value="simulador">Simulador</TabsTrigger>
          <TabsTrigger value="regras">Regras Fiscais</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="simulador">
          <TaxSimulator />
        </TabsContent>

        <TabsContent value="regras">
          <Card>
            <CardHeader><CardTitle>Regras Fiscais Configuradas</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-32" /> : rules.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma regra fiscal configurada.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Alíquota</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {rules.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.tax_type}</TableCell>
                        <TableCell className="text-right">{r.rate}%</TableCell>
                        <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <TaxInfoCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
