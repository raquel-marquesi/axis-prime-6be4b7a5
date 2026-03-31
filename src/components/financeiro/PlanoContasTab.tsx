import { useState } from 'react';
import { useChartOfAccounts, type ChartAccount } from '@/hooks/useChartOfAccounts';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2 } from 'lucide-react';

const typeLabels: Record<string, string> = { revenue: 'Receita', expense: 'Despesa', cost: 'Custo' };

export function PlanoContasTab() {
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount } = useChartOfAccounts();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChartAccount | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('revenue');
  const [parentId, setParentId] = useState('');
  const [level, setLevel] = useState(1);

  const openForm = (account?: ChartAccount) => {
    if (account) {
      setEditing(account);
      setCode(account.code);
      setName(account.name);
      setType(account.type);
      setParentId(account.parent_id || '');
      setLevel(account.level);
    } else {
      setEditing(null);
      setCode(''); setName(''); setType('revenue'); setParentId(''); setLevel(1);
    }
    setFormOpen(true);
  };

  const handleSubmit = () => {
    const data = { code, name, type, parent_id: parentId || null, level, active: true };
    if (editing) {
      updateAccount.mutate({ id: editing.id, ...data });
    } else {
      createAccount.mutate(data);
    }
    setFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Plano de Contas</h2>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-2" /> Nova Conta</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : accounts.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma conta cadastrada</TableCell></TableRow>
              ) : accounts.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="tabular-nums tracking-wide" style={{ paddingLeft: `${(a.level - 1) * 24 + 16}px` }}>{a.code}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell><Badge variant="outline">{typeLabels[a.type] || a.type}</Badge></TableCell>
                  <TableCell>{a.level}</TableCell>
                  <TableCell><Badge variant={a.active ? 'default' : 'secondary'}>{a.active ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openForm(a)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteAccount.mutate(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Conta' : 'Nova Conta Contábil'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Código</Label><Input value={code} onChange={e => setCode(e.target.value)} placeholder="1.1.01" /></div>
              <div><Label>Nível</Label><Input type="number" value={level} onChange={e => setLevel(Number(e.target.value))} min={1} max={5} /></div>
            </div>
            <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="cost">Custo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta Pai (opcional)</Label>
              <Select value={parentId || 'none'} onValueChange={(v) => setParentId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                  {accounts.filter(a => a.id !== editing?.id).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!code || !name}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}