import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/hooks/useUsers";
import { ROLE_LABELS, AVAILABLE_ROLES, AREA_LABELS, AreaSetor } from "@/types/auth";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
  onSuccess?: () => void;
}

const AREAS = Object.entries(AREA_LABELS) as [AreaSetor, string][];

export const UserDialog = ({ open, onOpenChange, user, onSuccess }: UserDialogProps) => {
  const { inviteUser, updateUserRole } = useUsers();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("assistente");
  const [area, setArea] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setEmail(user.email || "");
      setArea(user.area || "");
      setRole(user.roles?.[0] || "assistente");
    } else {
      setFullName("");
      setEmail("");
      setRole("assistente");
      setArea("");
    }
  }, [user, open]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isEditing) {
        await updateUserRole.mutateAsync({
          userId: user.user_id,
          newRole: role,
          oldRoles: user.roles || [],
        });
      } else {
        await inviteUser.mutateAsync({ email, fullName, role, area });
      }
      onSuccess?.();
    } catch {
      // errors handled by hook
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Usuário" : "Convidar Usuário"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isEditing} />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isEditing} />
          </div>
          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AVAILABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isEditing && (
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {AREAS.map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || (!isEditing && (!email || !fullName))}>
            {loading ? "Salvando..." : isEditing ? "Salvar" : "Enviar Convite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
