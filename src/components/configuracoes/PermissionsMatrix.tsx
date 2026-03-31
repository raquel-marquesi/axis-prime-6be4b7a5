import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import { MODULE_LABELS, ACTION_LABELS } from '@/types/auth';

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

export const PermissionsMatrix = () => {
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

  // Build lookup: `${role}:${permission_id}` → scope
  const rpMap = new Map<string, string>();
  rolePerms.forEach(rp => rpMap.set(`${rp.role}:${rp.permission_id}`, rp.scope));

  // Group permissions by module
  const modules = [...new Set(permissions.map(p => p.module))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Matriz de Permissões</CardTitle>
        <CardDescription>Visualização das permissões atribuídas a cada papel ({permissions.length} permissões × {roles.length} papéis = {rolePerms.length} vínculos).</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-64 w-full" /> : (
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Módulo / Ação</TableHead>
                  {roles.map((r: any) => (
                    <TableHead key={r.id} className="text-center min-w-[100px]">
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
                        const scope = rpMap.get(key);
                        return (
                          <TableCell key={r.id} className="text-center">
                            {scope ? (
                              <Badge variant="default" className="text-[10px] px-1.5">
                                {scope === 'all' ? '✓' : scope}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
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
