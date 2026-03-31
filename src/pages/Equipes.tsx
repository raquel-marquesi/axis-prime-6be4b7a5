import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTeamClients } from "@/hooks/useTeamClients";
import { useProfiles } from "@/hooks/useProfiles";
import { useClients } from "@/hooks/useClients";

const Equipes = () => {
  const { teamClients, isLoading, addClient, removeClient } = useTeamClients();
  const { profiles, getName } = useProfiles();
  const { clients } = useClients();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const teamsByLeader = useMemo(() => {
    const map = new Map<string, typeof teamClients>();
    teamClients.forEach((tc) => {
      const list = map.get(tc.team_lead_id) || [];
      list.push(tc);
      map.set(tc.team_lead_id, list);
    });
    return map;
  }, [teamClients]);

  const leaderIds = useMemo(() => Array.from(teamsByLeader.keys()), [teamsByLeader]);

  const getClientName = (clientId: string) => {
    const c = clients?.find((cl: any) => cl.id === clientId);
    return c?.nome || c?.razao_social || c?.nome_fantasia || "Cliente desconhecido";
  };

  const handleAdd = () => {
    if (!selectedLeader || !selectedClient) return;
    addClient.mutate(
      { teamLeadId: selectedLeader, clientId: selectedClient },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setSelectedLeader("");
          setSelectedClient("");
        },
      }
    );
  };

  const handleRemove = (id: string) => {
    removeClient.mutate(id);
  };

  // Leaders available for the select (from profiles)
  const leaderOptions = useMemo(() => {
    return profiles.filter((p) => leaderIds.includes(p.user_id) || true);
  }, [profiles, leaderIds]);

  // Clients not yet assigned to the selected leader
  const availableClients = useMemo(() => {
    if (!selectedLeader) return clients || [];
    const assigned = new Set(
      (teamsByLeader.get(selectedLeader) || []).map((tc) => tc.client_id)
    );
    return (clients || []).filter((c: any) => !assigned.has(c.id));
  }, [selectedLeader, teamsByLeader, clients]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando equipes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Equipes</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Vincular Cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Vincular Cliente a Líder</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Líder da Equipe</Label>
                <Select value={selectedLeader} onValueChange={setSelectedLeader}>
                  <SelectTrigger><SelectValue placeholder="Selecione o líder" /></SelectTrigger>
                  <SelectContent>
                    {leaderOptions.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {availableClients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome || c.razao_social || c.nome_fantasia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={!selectedLeader || !selectedClient}>
                Vincular
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {leaderIds.length === 0 && (
        <p className="text-muted-foreground text-center py-12">Nenhuma equipe encontrada. Vincule clientes a líderes para começar.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {leaderIds.map((leaderId) => {
          const members = teamsByLeader.get(leaderId) || [];
          const isExpanded = expandedTeam === leaderId;
          return (
            <Card key={leaderId}>
              <CardHeader
                className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer"
                onClick={() => setExpandedTeam(isExpanded ? null : leaderId)}
              >
                <div>
                  <CardTitle className="text-base font-semibold">{getName(leaderId)}</CardTitle>
                  <Badge variant="secondary" className="mt-1">
                    <Users className="h-3 w-3 mr-1" />
                    {members.length} cliente{members.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </CardHeader>
              {isExpanded && (
                <CardContent>
                  <ul className="space-y-2">
                    {members.map((tc) => (
                      <li key={tc.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{getClientName(tc.client_id)}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRemove(tc.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Equipes;
