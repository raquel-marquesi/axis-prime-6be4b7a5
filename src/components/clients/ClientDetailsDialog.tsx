import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useClientContacts, Client } from "@/hooks/useClients";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  value ? (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  ) : null
);

const ClientDetailsDialog = ({ open, onOpenChange, client }: Props) => {
  const { contacts } = useClientContacts(client?.id);

  if (!open || !client) return null;

  const displayName = client.nome || client.razao_social || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {displayName}
            <Badge variant={client.is_active ? "default" : "secondary"}>
              {client.is_active ? "Ativo" : "Inativo"}
            </Badge>
            <Badge variant="outline">{client.tipo === "fisica" ? "PF" : "PJ"}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="endereco">Endereço</TabsTrigger>
            <TabsTrigger value="contatos">Contatos ({contacts.length})</TabsTrigger>
            <TabsTrigger value="contrato">Contrato</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="grid grid-cols-2 gap-4 pt-4">
            {client.tipo === "fisica" ? (
              <>
                <Field label="CPF" value={client.cpf} />
                <Field label="RG" value={client.rg} />
                <Field label="Data Nascimento" value={client.data_nascimento ? format(new Date(client.data_nascimento), "dd/MM/yyyy") : null} />
              </>
            ) : (
              <>
                <Field label="CNPJ" value={client.cnpj} />
                <Field label="Nome Fantasia" value={client.nome_fantasia} />
                <Field label="Representante Legal" value={client.representante_legal} />
              </>
            )}
            <Field label="Centro de Custo" value={client.centro_custo} />
            <Field label="Grupo Econômico" value={client.economic_group_nome} />
            <Field label="Contrato-Chave" value={client.contract_key_nome} />
            <Field label="Filiais" value={client.branch_nomes?.join(", ")} />
            {client.observacoes && (
              <div className="col-span-2">
                <Field label="Observações" value={client.observacoes} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="endereco" className="grid grid-cols-2 gap-4 pt-4">
            <Field label="CEP" value={client.cep} />
            <Field label="Logradouro" value={client.logradouro} />
            <Field label="Número" value={client.numero} />
            <Field label="Complemento" value={client.complemento} />
            <Field label="Bairro" value={client.bairro} />
            <Field label="Cidade" value={client.cidade} />
            <Field label="Estado" value={client.estado} />
          </TabsContent>

          <TabsContent value="contatos" className="pt-4 space-y-3">
            {contacts.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>}
            {contacts.map((c) => (
              <div key={c.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{c.nome}</span>
                  <Badge variant="outline" className="text-xs">{c.tipo}</Badge>
                </div>
                {c.cargo && <p className="text-xs text-muted-foreground">{c.cargo}</p>}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {c.email && <span>{c.email}</span>}
                  {c.telefone && <span>Tel: {c.telefone}</span>}
                  {c.celular && <span>Cel: {c.celular}</span>}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="contrato" className="grid grid-cols-2 gap-4 pt-4">
            <Field label="Objeto" value={client.contrato_objeto} />
            <Field label="Condições de Faturamento" value={client.contrato_condicoes_faturamento} />
            <Field label="Data Início" value={client.contrato_data_inicio ? format(new Date(client.contrato_data_inicio), "dd/MM/yyyy") : null} />
            <Field label="Data Vencimento" value={client.contrato_data_vencimento ? format(new Date(client.contrato_data_vencimento), "dd/MM/yyyy") : null} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailsDialog;
