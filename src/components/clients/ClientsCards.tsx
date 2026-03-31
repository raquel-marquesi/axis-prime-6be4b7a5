import { useState } from 'react';
import { Client, useClients } from '@/hooks/useClients';
import { formatCPF, formatCNPJ } from '@/lib/validators';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Eye, Pencil, Building2, User, MapPin, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ClientsCardsProps {
  clients: Client[];
  onViewDetails: (client: Client) => void;
  onEdit: (client: Client) => void;
}

export function ClientsCards({ clients, onViewDetails, onEdit }: ClientsCardsProps) {
  const { isLeaderOrAbove, hasRole } = useAuth();
  const { deleteClient } = useClients();
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const isAdmin = hasRole('admin');

  const getDisplayName = (client: Client) => {
    return client.tipo === 'fisica' ? client.nome : client.razao_social;
  };

  const getDocument = (client: Client) => {
    if (client.tipo === 'fisica' && client.cpf) {
      return formatCPF(client.cpf);
    }
    if (client.tipo === 'juridica' && client.cnpj) {
      return formatCNPJ(client.cnpj);
    }
    return null;
  };

  const getLocation = (client: Client) => {
    const parts = [client.cidade, client.estado].filter(Boolean);
    return parts.length > 0 ? parts.join(' - ') : null;
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    await deleteClient.mutateAsync(clientToDelete.id);
    setClientToDelete(null);
  };

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Building2 className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum cliente encontrado</p>
        <p className="text-sm">Tente ajustar os filtros ou adicione um novo cliente.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <Card key={client.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    client.tipo === 'fisica' 
                      ? 'bg-blue-500/10 text-blue-500' 
                      : 'bg-purple-500/10 text-purple-500'
                  }`}>
                    {client.tipo === 'fisica' ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-1">
                      {getDisplayName(client)}
                    </h3>
                    {client.tipo === 'juridica' && client.nome_fantasia && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {client.nome_fantasia}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant={client.is_active ? 'default' : 'secondary'} className="shrink-0">
                  {client.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                {getDocument(client) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="tabular-nums tracking-wide">{getDocument(client)}</span>
                  </div>
                )}
                
                {getLocation(client) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{getLocation(client)}</span>
                  </div>
                )}

                {client.branch_nomes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {client.branch_nomes.map((nome, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {nome}
                      </Badge>
                    ))}
                  </div>
                )}

                {client.centro_custo && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      CC: {client.centro_custo}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onViewDetails(client)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Detalhes
                </Button>
                {isLeaderOrAbove() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(client)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive border-destructive/50 hover:border-destructive"
                    onClick={() => setClientToDelete(client)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente{' '}
              <strong>{clientToDelete ? getDisplayName(clientToDelete) : ''}</strong>?
              <br />
              <br />
              Esta ação é irreversível e também removerá todos os contatos e documentos associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteClient.isPending}
            >
              {deleteClient.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ClientsCards;
