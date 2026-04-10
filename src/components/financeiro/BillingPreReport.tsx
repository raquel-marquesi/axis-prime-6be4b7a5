import { useState } from "react";
import { usePendingTimesheet, useTimesheet } from "@/hooks/useTimesheet";
import { useClients } from "@/hooks/useClients";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle, Search, Filter, Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function BillingPreReport() {
  const [clientId, setClientId] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { clients } = useClients();
  const { entries, isLoading } = usePendingTimesheet({
    client_id: clientId === "all" ? undefined : clientId,
    startDate,
    endDate
  });
  
  const { approveEntries } = useTimesheet();

  const handleSelectAll = (checked: boolean) => {
    if (checked && entries) {
      setSelectedIds(entries.map((e: any) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleApprove = async () => {
    if (selectedIds.length === 0) return;
    await approveEntries.mutateAsync(selectedIds);
    setSelectedIds([]);
  };

  const totalWeighted = entries?.reduce((acc: number, entry: any) => {
    return acc + (entry.activity_type?.weight || 0) * (entry.quantidade || 1);
  }, 0) || 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Pré-relatório de Faturamento e Premiação</CardTitle>
              <CardDescription>
                Valide e aprove as atividades realizadas antes de gerar provisões financeiras e notas fiscais.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleApprove} 
                className="gap-2" 
                disabled={selectedIds.length === 0 || approveEntries.isPending}
              >
                {approveEntries.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Aprovar Selecionados ({selectedIds.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium mb-1 block">Cliente</label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id || ""}>
                      {client.nome || client.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <label className="text-xs font-medium mb-1 block">Data Início</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="w-40">
              <label className="text-xs font-medium mb-1 block">Data Fim</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Badge variant="outline" className="h-10 px-4 flex gap-2 items-center">
                <Info className="h-4 w-4 text-blue-500" />
                Total Ponderado: <span className="font-bold">{totalWeighted.toFixed(2)} pts</span>
              </Badge>
            </div>
          </div>

          <Alert className="mb-4 bg-muted/50 border-none">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs text-muted-foreground">
              Apenas lançamentos aprovados constarão na provisão de bônus (delay de 4 meses) e no faturamento mensal do cliente.
            </AlertDescription>
          </Alert>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={entries?.length > 0 && selectedIds.length === entries?.length}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                  </TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Processo / Cliente</TableHead>
                  <TableHead>Atividade</TableHead>
                  <TableHead>Descrição / Reclamante</TableHead>
                  <TableHead className="text-right">Peso (Pts)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">Carregando lançamentos...</p>
                    </TableCell>
                  </TableRow>
                ) : entries?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Nenhum lançamento pendente encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries?.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.includes(entry.id)}
                          onCheckedChange={(checked) => handleSelectOne(entry.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {format(new Date(entry.data_atividade), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{entry.user_profile?.full_name}</span>
                          <span className="text-xs text-muted-foreground uppercase">{entry.user_profile?.sigla}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col max-w-[200px]">
                          <span className="text-sm font-medium truncate">{entry.process?.numero_processo || 'S/N'}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {entry.process?.client?.nome || entry.process?.client?.razao_social || 'Cliente não vinculado'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {entry.activity_type?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col max-w-[250px]">
                          <span className="text-xs truncate" title={entry.descricao}>{entry.descricao}</span>
                          {entry.reclamante_nome && (
                            <span className="text-[10px] text-primary">{entry.reclamante_nome}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {(entry.activity_type?.weight || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
