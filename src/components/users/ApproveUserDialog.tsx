import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS, AVAILABLE_ROLES, AREA_LABELS, type AreaSetor } from "@/types/auth";

interface ApproveUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any | null;
  onSuccess?: () => void;
}

const AREAS = Object.entries(AREA_LABELS) as [AreaSetor, string][];

export const ApproveUserDialog = ({ open, onOpenChange, user, onSuccess }: ApproveUserDialogProps) => {
  const { user: currentUser } = useAuth();
  const [role, setRole] = useState("assistente");
  const [area, setArea] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setRole("assistente");
      setArea(user?.area || "");
    }
  }, [open, user]);

  const handleApprove = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Aprovar e definir área
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: currentUser?.id ?? null,
          area: area || null,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      // 2. Atribuir papel
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.user_id, role: role as any });
      if (roleError && !roleError.message.includes("duplicate")) throw roleError;

      toast.success(`${user.full_name} aprovado como ${ROLE_LABELS[role] || role}`);
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao aprovar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aprovar Usuário</DialogTitle>
          <DialogDescription>
            Defina o perfil e a área para {user?.full_name || user?.email}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleApprove} disabled={loading}>
            {loading ? "Aprovando..." : "Aprovar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
