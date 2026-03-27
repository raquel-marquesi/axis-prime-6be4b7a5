import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useSolicitacoes, type Solicitacao, type StatusSolicitacao } from '@/hooks/useSolicitacoes';
import { SolicitacoesTable } from '@/components/solicitacoes/SolicitacoesTable';
import { SolicitacaoFormDialog } from '@/components/solicitacoes/SolicitacaoFormDialog';
import { SolicitacaoDetailsDialog } from '@/components/solicitacoes/SolicitacaoDetailsDialog';
import { PrazosProcessuaisTab } from '@/components/solicitacoes/PrazosProcessuaisTab';

const Solicitacoes = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<Solicitacao | null>(null);
  const [editingSolicitacao, setEditingSolicitacao] = useState<Solicitacao | null>(null);

  const { solicitacoes, isLoading, createSolicitacao, updateSolicitacao, deleteSolicitacao, updateStatus } = useSolicitacoes();

  const counts = {
    pendente: solicitacoes.filter(s => s.status === 'pendente').length,
    em_andamento: solicitacoes.filter(s => s.status === 'em_andamento').length,
    concluida: solicitacoes.filter(s => s.status === 'concluida').length,
    cancelada: solicitacoes.filter(s => s.status === 'cancelada').length,
  };

  const handleCreate = () => { setEditingSolicitacao(null); setFormOpen(true); };
  const handleEdit = (s: Solicitacao) => { setEditingSolicitacao(s); setFormOpen(true); };
  const handleView = (s: Solicitacao) => { setSelectedSolicitacao(s); setDetailsOpen(true); };
  const handleSubmit = (data: any) => {
    if (editingSolicitacao) {
      updateSolicitacao.mutate({ ...data, id: editingSolicitacao.id }, { onSuccess: () => setFormOpen(false) });
    } else {
      createSolicitacao.mutate({ ...data, origem: 'manual' }, { onSuccess: () => setFormOpen(false) });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Solicitações e Prazos</h1>
          <p className="text-muted-foreground">Gerencie solicitações internas e prazos processuais.</p>
        </div>
        <Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" />Nova Solicitação</Button>
      </div>

      <Tabs defaultValue="solicitacoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
          <TabsTrigger value="prazos">Prazos Processuais</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitacoes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pendentes</CardTitle><AlertCircle className="h-4 w-4 text-yellow-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{counts.pendente}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Em Andamento</CardTitle><Clock className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{counts.em_andamento}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Concluídas</CardTitle><CheckCircle className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{counts.concluida}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Canceladas</CardTitle><XCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{counts.cancelada}</div></CardContent></Card>
          </div>
          <SolicitacoesTable
            solicitacoes={solicitacoes}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={(id) => deleteSolicitacao.mutate(id)}
            onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="prazos">
          <PrazosProcessuaisTab />
        </TabsContent>
      </Tabs>

      <SolicitacaoFormDialog open={formOpen} onOpenChange={setFormOpen} solicitacao={editingSolicitacao} onSubmit={handleSubmit} isLoading={createSolicitacao.isPending || updateSolicitacao.isPending} />
      <SolicitacaoDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} solicitacao={selectedSolicitacao} />
    </div>
  );
};

export default Solicitacoes;
