import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { UserDialog } from "@/components/users/UserDialog";
import { ROLE_LABELS, AREA_LABELS, type AreaSetor } from "@/types/auth";

export default function UserManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data: users = [], refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles" as any).select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  // Build map: user_id → roles[]
  const rolesMap = new Map<string, string[]>();
  userRoles.forEach((ur: any) => {
    const existing = rolesMap.get(ur.user_id) || [];
    existing.push(ur.role);
    rolesMap.set(ur.user_id, existing);
  });

  // Build map: profiles.id → full_name for reports_to
  const profileNameMap = new Map<string, string>();
  users.forEach((u: any) => profileNameMap.set(u.id, u.full_name));

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir usuário");
    } else {
      toast.success("Usuário excluído com sucesso");
      refetch();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Usuários</h1>
        <Button onClick={() => { setEditingUser(null); setIsDialogOpen(true); }}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Usuários do Sistema ({users.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: any) => {
                  const roles = rolesMap.get(user.user_id) || [];
                  const supervisorName = user.reports_to ? profileNameMap.get(user.reports_to) : null;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>{user.area ? (AREA_LABELS[user.area as AreaSetor] || user.area) : '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {roles.length > 0 ? roles.map(r => (
                            <Badge key={r} variant="outline" className="text-[10px]">{ROLE_LABELS[r] || r}</Badge>
                          )) : <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{supervisorName || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingUser(user); setIsDialogOpen(true); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(user.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UserDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} user={editingUser} onSuccess={() => { setIsDialogOpen(false); refetch(); }} />
    </div>
  );
}
