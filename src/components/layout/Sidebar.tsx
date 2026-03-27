import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Trophy,
  DollarSign, Settings, LogOut, ChevronLeft, ChevronRight,
  Inbox, Users, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/types/auth';
import type { PermissionModule } from '@/types/auth';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  module?: PermissionModule;
  adminOnly?: boolean;
  showAlways?: boolean;
  managerAndAdmin?: boolean;
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', showAlways: true },
  { icon: Building2, label: 'Clientes', path: '/clientes', module: 'crm' },
  { icon: FileText, label: 'Processos', path: '/processos', module: 'processos' },
  { icon: Inbox, label: 'Prazos', path: '/solicitacoes', module: 'solicitacoes' },
  { icon: Trophy, label: 'Premiação', path: '/premiacao', module: 'premiacao' },
  { icon: DollarSign, label: 'Financeiro', path: '/financeiro', module: 'financeiro' },
  { icon: Users, label: 'Equipes', path: '/equipes', managerAndAdmin: true },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', adminOnly: true },
];

export function Sidebar() {
  const location = useLocation();
  const { profile, roles, signOut, isAdmin, isAdminOrManager, can, hasRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const { data: customRoles = [] } = useQuery({
    queryKey: ['sidebar-custom-roles'],
    queryFn: async () => {
      const { data } = await supabase.from('custom_roles').select('name, label');
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const getRoleLabel = (roleName: string) => {
    const custom = customRoles.find(r => r.name === roleName);
    if (custom) return custom.label;
    return ROLE_LABELS[roleName] || roleName;
  };

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.adminOnly) return isAdmin() || hasRole('socio');
    if (item.managerAndAdmin) return isAdmin() || hasRole('gerente') || hasRole('socio');
    if (item.showAlways) return true;
    if (item.module) return can(item.module, 'visualizar');
    return true;
  });

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <NavLink to="/" className="flex items-center gap-3 flex-1 min-w-0">
          <img src={logo} alt="Marquesi" className="w-10 h-10 rounded-xl object-contain shrink-0" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sidebar-foreground">Marquesi</h1>
              <p className="text-xs text-sidebar-foreground/60">Consultoria</p>
            </div>
          )}
        </NavLink>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {filteredMenuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground'
                  )
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        {!collapsed && profile && (
          <div className="mb-3">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.full_name}</p>
            <p className="text-xs text-sidebar-foreground/60">
              {roles.map((r) => getRoleLabel(r)).join(', ')}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed && 'justify-center px-0'
          )}
          onClick={() => signOut()}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
