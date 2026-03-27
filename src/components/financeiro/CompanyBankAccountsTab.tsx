import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Loader2, Landmark, Building2 } from 'lucide-react';
import { useBankAccountsConfig, BankAccountConfig } from '@/hooks/useBankAccountsConfig';
import { useCompanyEntities } from '@/hooks/useCompanyEntities';
import { useBranches } from '@/hooks/useBranches';
import { useBanks } from '@/hooks/useBanks';

export function CompanyBankAccountsTab() {
  const { bankAccounts, isLoading, createBankAccount, updateBankAccount } = useBankAccountsConfig();
  const { entities } = useCompanyEntities();
  const { activeBranches } = useBranches();
  const { activeBanks } = useBanks();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccountConfig | null>(null);
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [form, setForm] = useState({ banco: '', agencia: '', conta: '', tipo: 'corrente', descricao: '', branch_id: '', company_entity_id: '', cedente: '', carteira: '', numero_convenio: '' });

  const openNew = (entityId?: string) => {
    setEditing(null);
    setForm({ banco: '', agencia: '', conta: '', tipo: 'corrente', descricao: '', branch_id: '', company_entity_id: entityId || '', cedente: '', carteira: '', numero_convenio: '' });
    setDialogOpen(true);
  };

  const openEdit = (ba: BankAccountConfig) => {
    setEditing(ba);
    setForm({ banco: ba.banco, agencia: ba.agencia, conta: ba.conta, tipo: ba.tipo || 'corrente', descricao: ba.descricao || '', branch_id: ba.branch_id || '', company_entity_id: ba.company_entity_id || '', cedente: ba.cedente || '', carteira: ba.carteira || '', numero_convenio: ba.numero_convenio || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = { ...form, branch_id: form.branch_id || null, company_entity_id: form.company_entity_id || null };
    if (editing) { await updateBankAccount.mutateAsync({ id: editing.id, ...data }); } else { await createBankAccount.mutateAsync(data as any); }
    setDialogOpen(false);
  };

  const filtered = useMemo(() => {
    return bankAccounts.filter((ba) => {
      if (filterEntity !== 'all') { if (filterEntity === 'none' && ba.company_entity_id) return false; if (filterEntity !== 'none' && ba.company_entity_id !== filterEntity) return false; }
      if (filterStatus === 'active' && !ba.is_active) return false;
      if (filterStatus === 'inactive' && ba.is_active) return false;
      return true;
    });
  }, [bankAccounts, filterEntity, filterStatus]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; accounts: BankAccountConfig[] }>();
    for (const ba of filtered) {
      const key = ba.company_entity_id || '__none__';
      if (!map.has(key)) map.set(key, { name: (ba as any).company_entity_name || 'Sem empresa vinculada', accounts: [] });
      map.get(key)!.accounts.push(ba);
    }
    const entries = Array.from(map.entries());
    entries.sort((a, b) => { if (a[0] === '__none__') return 1; if (b[0] === '__none__') return -1; return a[1].name.localeCompare(b[1].name); });
    return entries;
  }, [filtered]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                <SelectItem value="none">Sem empresa vinculada</SelectItem>
                {entities.filter(e => e.is_active).map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Ativas</SelectItem><SelectItem value="inactive">Inativas</SelectItem></SelectContent>
            </Select>
          </div>
          <Button onClick={() => openNew()}><Plus className="h-4 w-4 mr-2" /> Nova Conta Bancária</Button>
        </div>

        {grouped.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma conta bancária encontrada.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {grouped.map(([key, group]) => (
              <Card key={key}>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {key === '__none__' ? <Landmark className="h-4 w-4 text-muted-foreground" /> : <Building2 className="h-4 w-4 text-primary" />}
                    {group.name}<Badge variant="secondary" className="ml-1">{group.accounts.length}</Badge>
                  </CardTitle>
                  {key !== '__none__' && <Button variant="ghost" size="sm" onClick={() => openNew(key)}><Plus className="h-4 w-4" /></Button>}
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.accounts.map((ba) => (
                    <div key={ba.id} className="flex items-center justify-between border rounded-lg p-3 gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{ba.banco} — Ag {ba.agencia} / CC {ba.conta}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span>{ba.tipo === 'corrente' ? 'Corrente' : 'Poupança'}</span>
                          {ba.cedente && <><span>•</span><span>Cedente: {ba.cedente}</span></>}
                          {ba.carteira && <><span>•</span><span>Cart: {ba.carteira}</span></>}
                          {ba.numero_convenio && <><span>•</span><span>Conv: {ba.numero_convenio}</span></>}
                          {ba.descricao && <><span>•</span><span>{ba.descricao}</span></>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={ba.is_active ?? true} onCheckedChange={(v) => updateBankAccount.mutate({ id: ba.id, is_active: v })} />
                        <Button variant="ghost" size="icon" onClick={() => openEdit(ba)}><Pencil className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Empresa do Grupo</Label><Select value={form.company_entity_id || 'none'} onValueChange={v => setForm(f => ({ ...f, company_entity_id: v === 'none' ? '' : v }))}><SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{entities.filter(e => e.is_active).map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Banco *</Label><Select value={form.banco || 'none'} onValueChange={v => setForm(f => ({ ...f, banco: v === 'none' ? '' : v }))}><SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger><SelectContent><SelectItem value="none">Selecione...</SelectItem>{activeBanks.map(b => <SelectItem key={b.id} value={`${b.codigo} - ${b.nome}`}>{b.codigo} - {b.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Agência *</Label><Input value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))} /></div>
              <div><Label>Conta *</Label><Input value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tipo</Label><Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="corrente">Corrente</SelectItem><SelectItem value="poupanca">Poupança</SelectItem></SelectContent></Select></div>
              <div><Label>Filial</Label><Select value={form.branch_id || 'none'} onValueChange={v => setForm(f => ({ ...f, branch_id: v === 'none' ? '' : v }))}><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{activeBranches.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Cedente</Label><Input value={form.cedente} onChange={e => setForm(f => ({ ...f, cedente: e.target.value }))} /></div>
              <div><Label>Carteira</Label><Input value={form.carteira} onChange={e => setForm(f => ({ ...f, carteira: e.target.value }))} /></div>
              <div><Label>Nº Convênio</Label><Input value={form.numero_convenio} onChange={e => setForm(f => ({ ...f, numero_convenio: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={!form.banco || !form.agencia || !form.conta}>{editing ? 'Salvar' : 'Criar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}