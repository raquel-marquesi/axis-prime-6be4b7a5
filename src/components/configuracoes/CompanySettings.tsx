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
import { Building2, Plus, Users2, KeyRound, Tags } from 'lucide-react';
import { toast } from 'sonner';

export const CompanySettings = () => {
  const queryClient = useQueryClient();

  // ── Company Entities ──
  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['company-entities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_entities').select('*').order('razao_social');
      if (error) throw error;
      return data;
    },
  });

  // ── Branches ──
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });

  // ── Economic Groups ──
  const { data: econGroups = [], isLoading: loadingEG } = useQuery({
    queryKey: ['economic-groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('economic_groups').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const [egDialog, setEgDialog] = useState(false);
  const [egForm, setEgForm] = useState({ nome: '', descricao: '' });

  const createEG = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('economic_groups').insert({ nome: egForm.nome, descricao: egForm.descricao || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['economic-groups'] });
      toast.success('Grupo econômico criado');
      setEgDialog(false);
      setEgForm({ nome: '', descricao: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Contract Keys ──
  const { data: contractKeys = [], isLoading: loadingCK } = useQuery({
    queryKey: ['contract-keys'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_keys').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const [ckDialog, setCkDialog] = useState(false);
  const [ckForm, setCkForm] = useState({ nome: '', descricao: '' });

  const createCK = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contract_keys').insert({ nome: ckForm.nome, descricao: ckForm.descricao || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-keys'] });
      toast.success('Chave de contrato criada');
      setCkDialog(false);
      setCkForm({ nome: '', descricao: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Client Aliases ──
  const { data: clientAliases = [], isLoading: loadingCA } = useQuery({
    queryKey: ['client-aliases-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_aliases').select('*, clients(razao_social, nome)').order('alias');
      if (error) throw error;
      return data;
    },
  });

  // ── User Aliases ──
  const { data: userAliases = [], isLoading: loadingUA } = useQuery({
    queryKey: ['user-aliases-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_aliases' as any).select('*').order('alias');
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <div className="space-y-6">
      {/* Company Entities */}
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

      {/* Branches */}
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

      {/* Economic Groups */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Users2 className="h-5 w-5" />Grupos Econômicos</CardTitle>
            <CardDescription>Agrupamentos de clientes por grupo econômico.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setEgDialog(true)}><Plus className="h-4 w-4 mr-2" />Novo</Button>
        </CardHeader>
        <CardContent>
          {loadingEG ? <Skeleton className="h-32 w-full" /> : econGroups.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum grupo econômico.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {econGroups.map((eg: any) => (
                  <TableRow key={eg.id}>
                    <TableCell className="font-medium">{eg.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{eg.descricao || '—'}</TableCell>
                    <TableCell><Badge variant={eg.is_active ? 'default' : 'secondary'}>{eg.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Contract Keys */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />Chaves de Contrato</CardTitle>
            <CardDescription>Identificadores de contrato usados para agrupar clientes.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCkDialog(true)}><Plus className="h-4 w-4 mr-2" />Nova</Button>
        </CardHeader>
        <CardContent>
          {loadingCK ? <Skeleton className="h-32 w-full" /> : contractKeys.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma chave de contrato.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {contractKeys.map((ck: any) => (
                  <TableRow key={ck.id}>
                    <TableCell className="font-medium">{ck.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{ck.descricao || '—'}</TableCell>
                    <TableCell><Badge variant={ck.is_active ? 'default' : 'secondary'}>{ck.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Aliases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5" />Apelidos de Importação</CardTitle>
          <CardDescription>Nomes alternativos usados para matching automático nas importações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Clientes ({clientAliases.length})</h4>
            {loadingCA ? <Skeleton className="h-16 w-full" /> : clientAliases.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum apelido de cliente.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {clientAliases.map((ca: any) => (
                  <Badge key={ca.id} variant="outline" className="text-xs">
                    {ca.alias} → {ca.clients?.razao_social || ca.clients?.nome || '?'}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Usuários ({userAliases.length})</h4>
            {loadingUA ? <Skeleton className="h-16 w-full" /> : userAliases.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum apelido de usuário.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userAliases.map((ua: any) => (
                  <Badge key={ua.id} variant="outline" className="text-xs">{ua.alias}</Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={egDialog} onOpenChange={setEgDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Grupo Econômico</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={egForm.nome} onChange={e => setEgForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={egForm.descricao} onChange={e => setEgForm(p => ({ ...p, descricao: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEgDialog(false)}>Cancelar</Button>
            <Button onClick={() => createEG.mutate()} disabled={!egForm.nome || createEG.isPending}>{createEG.isPending ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ckDialog} onOpenChange={setCkDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Chave de Contrato</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={ckForm.nome} onChange={e => setCkForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={ckForm.descricao} onChange={e => setCkForm(p => ({ ...p, descricao: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCkDialog(false)}>Cancelar</Button>
            <Button onClick={() => createCK.mutate()} disabled={!ckForm.nome || createCK.isPending}>{createCK.isPending ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
