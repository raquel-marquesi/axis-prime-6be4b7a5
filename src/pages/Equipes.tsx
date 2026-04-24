import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, ChevronDown, ChevronUp, Building2, UserCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTeamClients } from "@/hooks/useTeamClients";
import { useClients } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string;
  sigla: string | null;
  area: string | null;
  reports_to: string | null;
  is_active: boolean;
}

const Equipes = () => {
  const { can } = useAuth();
  const { teamClients, isLoading: loadingTC, addClient, removeClient } = useTeamClients();
  const { clients } = useClients();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState<Record<string, boolean>>({});
  const [clientsOpen, setClientsOpen] = useState<Record<string, boolean>>({});

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["profiles-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_safe" as any)
        .select("id, user_id, full_name, sigla, area, reports_to, is_active");
      if (error) throw error;
      return (data as unknown as ProfileRow[]) ?? [];
    },
  });

  const profileById = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((p) => map.set(p.id, p));
    return map;
  }, [profiles]);

  // Leaders: profiles that have at least one subordinate (reports_to) OR at least one team_client
  const leaderIds = useMemo(() => {
    const ids = new Set<string>();
    profiles.forEach((p) => { 
      if (p.reports_to) ids.add(p.reports_to); 
    });
    teamClients.forEach((tc) => {
      if (tc.team_lead_id) ids.add(tc.team_lead_id);
    });
    return Array.from(ids).filter(id => !!id);
  }, [profiles, teamClients]);

  // Members grouped by leader (reports_to)
  const membersByLeader = useMemo(() => {
    const map = new Map<string, ProfileRow[]>();
    profiles.forEach((p) => {
      if (p.reports_to) {
        const list = map.get(p.reports_to) || [];
        list.push(p);
        map.set(p.reports_to, list);
      }
    });
    return map;
  }, [profiles]);

  // Team clients grouped by leader
  const tcByLeader = useMemo(() => {
    const map = new Map<string, typeof teamClients>();
    teamClients.forEach((tc) => {
      const list = map.get(tc.team_lead_id) || [];
      list.push(tc);
      map.set(tc.team_lead_id, list);
    });
    return map;
  }, [teamClients]);

  const getLeaderName = (id: string) => {
    const p = profileById.get(id);
    if (p) return p.full_name;
    // Fallback: search in teamClients if data was provided there as leader_name
    const tcItem = teamClients.find(tc => tc.team_lead_id === id);
    return tcItem?.leader_name || "Líder não identificado";
  };

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

  // Leaders available for the select — only profiles that are already leaders or could be
  const leaderOptions = useMemo(() => {
    return profiles.filter((p) => p.is_active);
  }, [profiles]);

  // Clients not yet assigned to the selected leader
  const availableClients = useMemo(() => {
    if (!selectedLeader) return clients || [];
    const assigned = new Set(
      (tcByLeader.get(selectedLeader) || []).map((tc) => tc.client_id)
    );
    return (clients || []).filter((c: any) => !assigned.has(c.id));
  }, [selectedLeader, tcByLeader, clients]);

  const isLoading = loadingTC || loadingProfiles;

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
        {can('usuarios', 'editar') && (
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
                        <SelectItem key={p.id} value={p.id}>
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
        )}
      </div>

      {leaderIds.length === 0 && (
        <p className="text-muted-foreground text-center py-12">Nenhuma equipe encontrada.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {leaderIds.map((leaderId) => {
          const members = membersByLeader.get(leaderId) || [];
          const tcs = tcByLeader.get(leaderId) || [];
          const isExpanded = expandedTeam === leaderId;
          return (
            <Card key={leaderId}>
              <CardHeader
                className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer"
                onClick={() => setExpandedTeam(isExpanded ? null : leaderId)}
              >
                <div>
                  <CardTitle className="text-base font-semibold">{getLeaderName(leaderId)}</CardTitle>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {members.length} membro{members.length !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      {tcs.length} cliente{tcs.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </CardHeader>
              {isExpanded && (
                <CardContent className="space-y-3">
                  {/* Membros da Equipe */}
                  <Collapsible
                    open={membersOpen[leaderId] ?? true}
                    onOpenChange={(open) => setMembersOpen((prev) => ({ ...prev, [leaderId]: open }))}
                  >
                    <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground w-full">
                      <UserCheck className="h-3.5 w-3.5" />
                      Membros da Equipe ({members.length})
                      {(membersOpen[leaderId] ?? true) ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {members.length === 0 ? (
                        <p className="text-xs text-muted-foreground pl-5 py-1">Nenhum membro</p>
                      ) : (
                        <ul className="space-y-1 mt-1">
                          {members.map((m) => (
                            <li key={m.id} className="flex items-center justify-between text-sm pl-5">
                              <span className="truncate">{m.full_name}</span>
                              {m.sigla && <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">{m.sigla}</Badge>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Clientes Vinculados */}
                  <Collapsible
                    open={clientsOpen[leaderId] ?? false}
                    onOpenChange={(open) => setClientsOpen((prev) => ({ ...prev, [leaderId]: open }))}
                  >
                    <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground w-full">
                      <Building2 className="h-3.5 w-3.5" />
                      Clientes Vinculados ({tcs.length})
                      {(clientsOpen[leaderId] ?? false) ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {tcs.length === 0 ? (
                        <p className="text-xs text-muted-foreground pl-5 py-1">Nenhum cliente vinculado</p>
                      ) : (
                        <ul className="space-y-1 mt-1">
                          {tcs.map((tc) => (
                            <li key={tc.id} className="flex items-center justify-between text-sm pl-5">
                              <span className="truncate">{getClientName(tc.client_id)}</span>
                              {can('usuarios', 'editar') && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeClient.mutate(tc.id)}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
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
