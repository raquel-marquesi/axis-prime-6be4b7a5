import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PermissionModule, PermissionAction, PermissionScope, AppRole } from '@/types/auth';

interface PermissionEntry {
  module: PermissionModule;
  action: PermissionAction;
  scope: PermissionScope;
  source: 'role' | 'override';
}

interface UsePermissionsResult {
  can: (module: PermissionModule, action: PermissionAction) => boolean;
  canAny: (module: PermissionModule, actions: PermissionAction[]) => boolean;
  getScope: (module: PermissionModule, action: PermissionAction) => PermissionScope | null;
  permissions: PermissionEntry[];
  isLoading: boolean;
  refetch: () => void;
}

export function usePermissions(userId: string | undefined, roles: AppRole[]): UsePermissionsResult {
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!userId) { setPermissions([]); setIsLoading(false); return; }
    try {
      const { data: rolePerms } = await supabase
        .from('role_permissions' as any)
        .select('role, scope, permissions(module, action)')
        .in('role', roles);
      const { data: overrides } = await supabase
        .from('user_permission_overrides' as any)
        .select('granted, scope, permissions(module, action)')
        .eq('user_id', userId);
      const effectivePerms: Map<string, PermissionEntry> = new Map();
      if (rolePerms) {
        for (const rp of rolePerms as any[]) {
          const p = rp.permissions as any;
          if (!p) continue;
          const key = `${p.module}:${p.action}`;
          const existing = effectivePerms.get(key);
          const scopePriority: Record<string, number> = { all: 3, team: 2, own: 1 };
          if (!existing || (scopePriority[rp.scope] || 0) > (scopePriority[existing.scope] || 0)) {
            effectivePerms.set(key, { module: p.module, action: p.action, scope: rp.scope, source: 'role' });
          }
        }
      }
      if (overrides) {
        for (const ov of overrides as any[]) {
          const p = ov.permissions as any;
          if (!p) continue;
          const key = `${p.module}:${p.action}`;
          if (ov.granted) {
            effectivePerms.set(key, { module: p.module, action: p.action, scope: ov.scope, source: 'override' });
          } else {
            effectivePerms.delete(key);
          }
        }
      }
      setPermissions(Array.from(effectivePerms.values()));
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, roles.join(',')]);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const permMap = useMemo(() => {
    const map = new Map<string, PermissionEntry>();
    for (const p of permissions) { map.set(`${p.module}:${p.action}`, p); }
    return map;
  }, [permissions]);

  const can = useCallback((module: PermissionModule, action: PermissionAction) => permMap.has(`${module}:${action}`), [permMap]);
  const canAny = useCallback((module: PermissionModule, actions: PermissionAction[]) => actions.some((a) => permMap.has(`${module}:${a}`)), [permMap]);
  const getScope = useCallback((module: PermissionModule, action: PermissionAction): PermissionScope | null => {
    const entry = permMap.get(`${module}:${action}`);
    return entry?.scope ?? null;
  }, [permMap]);

  return { can, canAny, getScope, permissions, isLoading, refetch: fetchPermissions };
}
