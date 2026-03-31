import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Equipes = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  const { data: equipes, refetch } = useQuery({
    queryKey: ["equipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes" as any)
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    const { error } = await supabase.from("equipes" as any).insert([{ nome: newTeamName }] as any);
    if (error) { toast.error("Erro ao criar equipe"); return; }
    toast.success("Equipe criada com sucesso");
    setNewTeamName("");
    setIsDialogOpen(false);
    refetch();
  };

  const handleDeleteTeam = async (id: string) => {
    const { error } = await supabase.from("equipes" as any).delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir equipe"); return; }
    toast.success("Equipe excluída");
    refetch();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Equipes</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nova Equipe</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Nova Equipe</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Equipe</Label>
                <Input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Ex: Equipe Jurídica A" />
              </div>
              <Button onClick={handleCreateTeam} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {equipes?.map((equipe: any) => (
          <Card key={equipe.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{equipe.nome}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="ghost" size="icon"><Edit2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteTeam(equipe.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Equipes;
