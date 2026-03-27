import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';

export const CompanySettings = () => {
  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['company-entities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_entities').select('*').order('razao_social');
      if (error) throw error;
      return data;
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Empresas / Entidades</CardTitle>
          <CardDescription>Entidades jurídicas cadastradas no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-32 w-full" /> : entities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma empresa cadastrada.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Razão Social</TableHead><TableHead>Nome Fantasia</TableHead><TableHead>CNPJ</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {entities.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.razao_social}</TableCell>
                    <TableCell>{e.nome_fantasia || '—'}</TableCell>
                    <TableCell>{e.cnpj}</TableCell>
                    <TableCell><Badge variant={e.is_active ? 'default' : 'secondary'}>{e.is_active ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filiais</CardTitle>
          <CardDescription>Unidades operacionais.</CardDescription>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma filial cadastrada.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {branches.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.nome}</TableCell>
                    <TableCell><Badge variant={b.is_active ? 'default' : 'secondary'}>{b.is_active ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
