import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Trash2, Edit2, Check, X, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { UserDialog } from "@/components/users/UserDialog";
import { ApproveUserDialog } from "@/components/users/ApproveUserDialog";
import { ROLE_LABELS, AREA_LABELS, type AreaSetor } from "@/types/auth";
import { useAuth } from "@/contexts/AuthContext";

export default function UserManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvingUser, setApprovingUser] = useState<any>(null);
  const { user: currentUser } = useAuth();

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

  const approvedUsers = users.filter((u: any) => u.approved === true);
  const pendingUsers = users.filter((u: any) => u.approved !== true);

  const handleDelete = async (user: any) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${user.full_name}?`)) return;
    const { error } = await supabase.functions.invoke("delete-user", {
      body: { userId: user.user_id },
    });
    if (error) {
      toast.error("Erro ao excluir usuário: " + error.message);
    } else {
      toast.success("Usuário excluído com sucesso");
      refetch();
    }
  };


  const handleApprove = async (user: any) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
        approved_by: currentUser?.id ?? null,
      })
      .eq("id", user.id);
    if (error) {
      toast.error("Erro ao aprovar usuário: " + error.message);
    } else {
      toast.success(`${user.full_name} aprovado com sucesso`);
      refetch();
    }
  };

  const handleReject = async (user: any) => {
    if (!confirm(`Rejeitar e excluir o cadastro de ${user.full_name}?`)) return;
    const { error } = await supabase.functions.invoke("delete-user", {
      body: { userId: user.user_id },
    });
    if (error) {
      toast.error("Erro ao rejeitar usuário: " + error.message);
    } else {
      toast.success("Cadastro rejeitado");
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

      <Tabs defaultValue="sistema" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sistema" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários do Sistema ({approvedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="aprovacao" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Usuários para Aprovação ({pendingUsers.length})
            {pendingUsers.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">{pendingUsers.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sistema">
          <Card>
            <CardHeader><CardTitle>Usuários do Sistema ({approvedUsers.length})</CardTitle></CardHeader>
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
                    {approvedUsers.map((user: any) => {
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
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(user)}>
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
        </TabsContent>

        <TabsContent value="aprovacao">
          <Card>
            <CardHeader>
              <CardTitle>Usuários para Aprovação ({pendingUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum usuário aguardando aprovação.
                </p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Cadastrado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                          <TableCell className="text-sm">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(user)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleReject(user)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UserDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} user={editingUser} onSuccess={() => { setIsDialogOpen(false); refetch(); }} />
    </div>
  );
}
