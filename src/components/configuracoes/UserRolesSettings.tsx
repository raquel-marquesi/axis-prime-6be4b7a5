import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PermissionsMatrix } from './PermissionsMatrix';

export const UserRolesSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('custom_roles').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const createRole = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('custom_roles').insert({ name: newName.toLowerCase().replace(/\s+/g, '_'), label: newLabel, description: newDesc || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast({ title: 'Papel criado com sucesso' });
      setDialogOpen(false);
      setNewName(''); setNewLabel(''); setNewDesc('');
    },
    onError: (e: Error) => toast({ title: 'Erro ao criar papel', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Papéis e Permissões</CardTitle>
            <CardDescription>Gerencie os papéis de acesso do sistema.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Papel</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-32 w-full" /> : roles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum papel configurado.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Identificador</TableHead><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Tipo</TableHead></TableRow></TableHeader>
              <TableBody>
                {roles.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.name}</code></TableCell>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="text-muted-foreground">{r.description || '—'}</TableCell>
                    <TableCell><Badge variant={r.is_system ? 'default' : 'outline'}>{r.is_system ? 'Sistema' : 'Custom'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PermissionsMatrix />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Papel</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Identificador</Label><Input placeholder="ex: auditor" value={newName} onChange={e => setNewName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Nome de Exibição</Label><Input placeholder="ex: Auditor" value={newLabel} onChange={e => setNewLabel(e.target.value)} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input placeholder="Descrição do papel" value={newDesc} onChange={e => setNewDesc(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createRole.mutate()} disabled={!newName || !newLabel || createRole.isPending}>{createRole.isPending ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
