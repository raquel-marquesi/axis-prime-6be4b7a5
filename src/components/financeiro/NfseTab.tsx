import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNfse } from '@/hooks/useNfse';
import { NfseConfigDialog } from './NfseConfigDialog';
import { NfseEmitDialog } from './NfseEmitDialog';
import { Settings, Send, MoreHorizontal, FileText, FileCode, XCircle, Mail, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  pendente: { label: 'Pendente', variant: 'secondary' },
  processando: { label: 'Em Transmissão', variant: 'default', className: 'bg-blue-500' },
  autorizada: { label: 'Autorizada', variant: 'default', className: 'bg-green-600' },
  erro: { label: 'Erro', variant: 'destructive' },
  cancelada: { label: 'Cancelada', variant: 'outline' },
};

export function NfseTab() {
  const { invoices, isLoadingInvoices, stats, sumValues, cancelNfse, config } = useNfse();
  const [configOpen, setConfigOpen] = useState(false);
  const [emitDialogOpen, setEmitDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const nfeStatus = inv.nfe_status || 'rascunho';
      if (statusFilter !== 'todos' && nfeStatus !== statusFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const accountName = (inv as any).accounts?.nome || '';
        const contactName = (inv as any).billing_contacts?.razao_social || '';
        const nf = inv.numero_nf || '';
        if (
          !accountName.toLowerCase().includes(search) &&
          !contactName.toLowerCase().includes(search) &&
          !nf.toLowerCase().includes(search)
        ) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, searchTerm]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map(i => i.id)));
    }
  };

  const handleEmit = (invoice: any) => {
    setSelectedInvoice(invoice);
    setEmitDialogOpen(true);
  };

  const handleCancelConfirm = () => {
    if (invoiceToCancel) {
      cancelNfse.mutate(invoiceToCancel);
    }
    setCancelDialogOpen(false);
    setInvoiceToCancel(null);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const statusCards = [
    { key: 'pendente', label: 'Em Aberto', items: stats.pendente, bgClass: 'bg-muted' },
    { key: 'processando', label: 'Em Transmissão', items: stats.processando, bgClass: 'bg-blue-500/10 border-blue-500/30' },
    { key: 'autorizada', label: 'Emitidas', items: stats.autorizada, bgClass: 'bg-green-500/10 border-green-500/30' },
    { key: 'erro', label: 'Com Falha', items: stats.erro, bgClass: 'bg-destructive/10 border-destructive/30' },
    { key: 'cancelada', label: 'Canceladas', items: stats.cancelada, bgClass: 'bg-muted/50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">NFS-e — Notas Fiscais de Serviço</h2>
          <p className="text-sm text-muted-foreground">Emissão e gestão de NFS-e via provedor integrado</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
          <Settings className="h-4 w-4 mr-2" /> Configurações
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {statusCards.map(card => (
          <Card key={card.key} className={card.bgClass}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.items.length}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(sumValues(card.items))}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm font-medium">Total do Período</span>
          <span className="text-xl font-bold">{formatCurrency(sumValues(invoices))}</span>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente ou número..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="processando">Em Transmissão</SelectItem>
            <SelectItem value="autorizada">Autorizada</SelectItem>
            <SelectItem value="erro">Erro</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        {selectedIds.size > 0 && (
          <Button size="sm" onClick={() => {
            const toEmit = filteredInvoices.filter(i => selectedIds.has(i.id) && (!i.nfe_status || i.nfe_status === 'rascunho' || i.nfe_status === 'pendente'));
            if (toEmit.length > 0) handleEmit(toEmit[0]);
          }}>
            <Send className="h-4 w-4 mr-2" /> Emitir Selecionadas ({selectedIds.size})
          </Button>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Nº NF</TableHead>
              <TableHead>Conta / Cliente</TableHead>
              <TableHead className="text-right">Valor (R$)</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="w-10">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingInvoices ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma invoice encontrada</TableCell></TableRow>
            ) : (
              filteredInvoices.map(inv => {
                const nfeStatus = inv.nfe_status || 'rascunho';
                const statusCfg = STATUS_CONFIG[nfeStatus] || STATUS_CONFIG.rascunho;
                const canEmit = !inv.nfe_status || inv.nfe_status === 'rascunho' || inv.nfe_status === 'pendente' || inv.nfe_status === 'erro';
                const isAutorizada = inv.nfe_status === 'autorizada';
                return (
                  <TableRow key={inv.id}>
                    <TableCell><Checkbox checked={selectedIds.has(inv.id)} onCheckedChange={() => toggleSelect(inv.id)} /></TableCell>
                    <TableCell>{inv.data_emissao ? format(new Date(inv.data_emissao), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell>{inv.numero_nf || '-'}</TableCell>
                    <TableCell>
                      <div>{(inv as any).accounts?.nome || '-'}</div>
                      <div className="text-xs text-muted-foreground">{(inv as any).billing_contacts?.razao_social || ''}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{inv.valor ? formatCurrency(inv.valor) : '-'}</TableCell>
                    <TableCell><Badge variant={statusCfg.variant} className={statusCfg.className}>{statusCfg.label}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEmit && <DropdownMenuItem onClick={() => handleEmit(inv)}><Send className="h-4 w-4 mr-2" /> Emitir NFS-e</DropdownMenuItem>}
                          {inv.nfe_status === 'processando' && <DropdownMenuItem><RefreshCw className="h-4 w-4 mr-2" /> Consultar Status</DropdownMenuItem>}
                          {isAutorizada && inv.nfe_pdf_url && <DropdownMenuItem onClick={() => window.open(inv.nfe_pdf_url!, '_blank')}><FileText className="h-4 w-4 mr-2" /> Baixar PDF</DropdownMenuItem>}
                          {isAutorizada && inv.nfe_xml_url && <DropdownMenuItem onClick={() => window.open(inv.nfe_xml_url!, '_blank')}><FileCode className="h-4 w-4 mr-2" /> Baixar XML</DropdownMenuItem>}
                          {isAutorizada && (
                            <>
                              <DropdownMenuItem><Mail className="h-4 w-4 mr-2" /> Reenviar por Email</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { setInvoiceToCancel(inv.id); setCancelDialogOpen(true); }}>
                                <XCircle className="h-4 w-4 mr-2" /> Cancelar NFS-e
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <NfseConfigDialog open={configOpen} onOpenChange={setConfigOpen} />
      <NfseEmitDialog open={emitDialogOpen} onOpenChange={setEmitDialogOpen} invoice={selectedInvoice} />

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar NFS-e</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja cancelar esta NFS-e? Essa ação será enviada ao provedor e não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive text-destructive-foreground">Cancelar NFS-e</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}