import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useClients, Client } from '@/hooks/useClients';
import { useBranches } from '@/hooks/useBranches';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientsCards } from '@/components/clients/ClientsCards';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { ClientDetailsDialog } from '@/components/clients/ClientDetailsDialog';
import { BatchImportClientsDialog } from '@/components/clients/BatchImportClientsDialog';
import { ClientDataExportButton } from '@/components/clients/ClientDataExportButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Building2,
  User,
  Filter,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useEconomicGroups } from '@/hooks/useEconomicGroups';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CarteiraReport } from '@/components/relatorios/CarteiraReport';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

type ViewMode = 'table' | 'cards';
type FilterType = 'all' | 'fisica' | 'juridica';
type FilterStatus = 'all' | 'active' | 'inactive';
type FilterCadastro = 'all' | 'cliente' | 'fornecedor';

export default function Clients() {
  const { clients, isLoading } = useClients();
  const { branches } = useBranches();
  const { groups, contractKeys } = useEconomicGroups();
  const { isLeaderOrAbove } = useAuth();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterCadastro, setFilterCadastro] = useState<FilterCadastro>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterContract, setFilterContract] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        client.nome?.toLowerCase().includes(searchLower) ||
        client.razao_social?.toLowerCase().includes(searchLower) ||
        client.cpf?.includes(search) ||
        client.cnpj?.includes(search) ||
        client.centro_custo?.toLowerCase().includes(searchLower);

      const matchesType =
        filterType === 'all' || client.tipo === filterType;

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && client.is_active) ||
        (filterStatus === 'inactive' && !client.is_active);

      const matchesBranch =
        filterBranch === 'all' || client.branch_ids.includes(filterBranch);

      const matchesCadastro =
        filterCadastro === 'all' || client.tipo_cadastro === filterCadastro;

      const matchesGroup =
        filterGroup === 'all' || client.economic_group_id === filterGroup;

      const matchesContract =
        filterContract === 'all' || client.contract_key_id === filterContract;

      return matchesSearch && matchesType && matchesStatus && matchesBranch && matchesCadastro && matchesGroup && matchesContract;
    });
  }, [clients, search, filterType, filterStatus, filterBranch, filterCadastro, filterGroup, filterContract]);

  const stats = useMemo(() => {
    const total = clients.length;
    const pf = clients.filter((c) => c.tipo === 'fisica').length;
    const pj = clients.filter((c) => c.tipo === 'juridica').length;
    const active = clients.filter((c) => c.is_active).length;
    return { total, pf, pj, active };
  }, [clients]);

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditClient(client);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditClient(null);
  };

  const handleSyncSheet = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-clients-sheet');
      if (error) throw error;
      const result = data as { created?: number; updated?: number; failed?: number; message?: string };
      toast.success(
        `${result.message || 'Sincronização concluída'}: ${result.created || 0} criados, ${result.updated || 0} atualizados` +
        (result.failed ? `, ${result.failed} com erro` : '')
      );
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (err: any) {
      toast.error('Erro ao sincronizar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Contratos</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie sua base de contratos
            </p>
          </div>
        </div>

        <Tabs defaultValue="cadastro" className="space-y-4">
          <TabsList>
            <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="cadastro">
          <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div></div>
          {isLeaderOrAbove() && (
            <div className="flex gap-2">
              <ClientDataExportButton clients={filteredClients} />
              <Button variant="outline" onClick={handleSyncSheet} disabled={isSyncing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Planilha'}
              </Button>
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <User className="w-4 h-4" />
              <span className="text-sm">Pessoa Física</span>
            </div>
            <p className="text-2xl font-bold">{stats.pf}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">Pessoa Jurídica</span>
            </div>
            <p className="text-2xl font-bold">{stats.pj}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Filter className="w-4 h-4" />
              <span className="text-sm">Ativos</span>
            </div>
            <p className="text-2xl font-bold">{stats.active}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, documento ou centro de custo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="fisica">Pessoa Física</SelectItem>
                <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCadastro} onValueChange={(v) => setFilterCadastro(v as FilterCadastro)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Cadastro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="cliente">Clientes</SelectItem>
                <SelectItem value="fornecedor">Fornecedores</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as filiais</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Grupo Econômico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {groups.filter(g => g.is_active).map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterContract} onValueChange={setFilterContract}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Contrato-Chave" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os contratos</SelectItem>
                {contractKeys.filter(ck => ck.is_active).map((ck) => (
                  <SelectItem key={ck.id} value={ck.id}>{ck.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex border border-border rounded-md">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('cards')}
                className="rounded-l-none"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : viewMode === 'table' ? (
          <ClientsTable
            clients={filteredClients}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
          />
        ) : (
          <ClientsCards
            clients={filteredClients}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
          />
        )}
          </div>
          </TabsContent>

          <TabsContent value="relatorios">
            <CarteiraReport />
          </TabsContent>
        </Tabs>
      </div>
      <ClientFormDialog
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        client={editClient}
      />

      <ClientDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        client={selectedClient}
        onEdit={handleEdit}
      />

      <BatchImportClientsDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
    </MainLayout>
  );
}