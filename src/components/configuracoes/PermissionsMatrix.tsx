import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield } from 'lucide-react';
import { MODULE_LABELS, ACTION_LABELS } from '@/types/auth';
import { toast } from 'sonner';

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string | null;
}

interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
  scope: string;
}

const SCOPES = [
  { value: 'own', label: 'Próprio' },
  { value: 'team', label: 'Equipe' },
  { value: 'all', label: 'Todos' },
];

export const PermissionsMatrix = () => {
  const queryClient = useQueryClient();
  const [mutating, setMutating] = useState<Set<string>>(new Set());

  const { data: permissions = [], isLoading: loadingP } = useQuery({
    queryKey: ['permissions-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('permissions' as any).select('*').order('module').order('action');
      if (error) throw error;
      return data as unknown as Permission[];
    },
  });

  const { data: rolePerms = [], isLoading: loadingRP } = useQuery({
    queryKey: ['role-permissions-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('role_permissions' as any).select('*');
      if (error) throw error;
      return data as unknown as RolePermission[];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('custom_roles').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingP || loadingRP;

  // Build lookups
  const rpMap = new Map<string, RolePermission>();
  rolePerms.forEach(rp => rpMap.set(`${rp.role}:${rp.permission_id}`, rp));

  const modules = [...new Set(permissions.map(p => p.module))];

  const setMutatingKey = (key: string, active: boolean) => {
    setMutating(prev => {
      const next = new Set(prev);
      active ? next.add(key) : next.delete(key);
      return next;
    });
  };

  const handleToggle = useCallback(async (roleName: string, permId: string, existing: RolePermission | undefined) => {
    const key = `${roleName}:${permId}`;
    setMutatingKey(key, true);
    try {
      if (existing) {
        const { error } = await supabase.from('role_permissions' as any).delete().eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('role_permissions' as any).insert({
          role: roleName,
          permission_id: permId,
          scope: 'all',
        });
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ['role-permissions-list'] });
    } catch (err: any) {
      toast.error(`Erro ao alterar permissão: ${err.message}`);
    } finally {
      setMutatingKey(key, false);
    }
  }, [queryClient]);

  const handleScopeChange = useCallback(async (rpId: string, newScope: string, key: string) => {
    setMutatingKey(key, true);
    try {
      const { error } = await supabase.from('role_permissions' as any).update({ scope: newScope }).eq('id', rpId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['role-permissions-list'] });
    } catch (err: any) {
      toast.error(`Erro ao alterar escopo: ${err.message}`);
    } finally {
      setMutatingKey(key, false);
    }
  }, [queryClient]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Matriz de Permissões</CardTitle>
        <CardDescription>
          Gerencie as permissões de cada papel. Clique para ativar/desativar e selecione o escopo.
          ({permissions.length} permissões × {roles.length} papéis = {rolePerms.length} vínculos)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-64 w-full" /> : (
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Módulo / Ação</TableHead>
                  {roles.map((r: any) => (
                    <TableHead key={r.id} className="text-center min-w-[120px]">
                      <span className="text-xs">{r.label}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map(mod => {
                  const modPerms = permissions.filter(p => p.module === mod);
                  return modPerms.map((perm, idx) => (
                    <TableRow key={perm.id}>
                      <TableCell className="sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <Badge variant="outline" className="text-xs">{MODULE_LABELS[mod as keyof typeof MODULE_LABELS] || mod}</Badge>}
                          {idx > 0 && <span className="w-16" />}
                          <span className="text-xs text-muted-foreground">{ACTION_LABELS[perm.action as keyof typeof ACTION_LABELS] || perm.action}</span>
                        </div>
                      </TableCell>
                      {roles.map((r: any) => {
                        const key = `${r.name}:${perm.id}`;
                        const existing = rpMap.get(key);
                        const isMutating = mutating.has(key);
                        return (
                          <TableCell key={r.id} className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Checkbox
                                checked={!!existing}
                                disabled={isMutating}
                                onCheckedChange={() => handleToggle(r.name, perm.id, existing)}
                                className="data-[state=checked]:bg-primary"
                              />
                              {existing && (
                                <Select
                                  value={existing.scope}
                                  onValueChange={(v) => handleScopeChange(existing.id, v, key)}
                                  disabled={isMutating}
                                >
                                  <SelectTrigger className="h-5 w-[70px] text-[10px] px-1 py-0">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SCOPES.map(s => (
                                      <SelectItem key={s.value} value={s.value} className="text-xs">
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ));
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
