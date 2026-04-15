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
  const { profile, roles, signOut, isAdmin, isAdminOrManager, can, hasRole, permissionsLoaded } = useAuth();
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
    // While permissions are still loading, show all module items to avoid flash of empty sidebar
    if (item.module) return !permissionsLoaded || can(item.module, 'visualizar');
    return true;
  });

  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r border-sidebar-border transition-all duration-300',
        'bg-sidebar',
        collapsed ? 'w-16' : 'w-64'
      )}
      style={{ boxShadow: '2px 0 16px rgba(0,0,0,0.14)' }}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <NavLink to="/" className="flex items-center gap-3 flex-1 min-w-0">
          <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden ring-2 ring-sidebar-primary/30">
            <img src={logo} alt="Marquesi" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sidebar-foreground tracking-tight leading-tight">Marquesi</h1>
              <p className="text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-widest">Consultoria</p>
            </div>
          )}
        </NavLink>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {!collapsed && (
          <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
            Menu
          </p>
        )}
        <ul className="space-y-0.5 px-2">
          {filteredMenuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                    'cursor-pointer select-none',
                    isActive
                      ? 'text-sidebar-primary font-semibold bg-sidebar-primary/15 border-l-2 border-sidebar-primary'
                      : 'text-sidebar-foreground/70 font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-l-2 border-transparent'
                  )
                }
              >
                <item.icon className={cn('shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
                {!collapsed && <span className="text-sm truncate">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User profile + logout */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        {!collapsed && profile && (
          <div className="flex items-center gap-2.5 px-1 mb-2">
            {/* Avatar initials */}
            <div className="w-7 h-7 rounded-full bg-sidebar-primary/25 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-sidebar-primary">
                {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">{profile.full_name}</p>
              <p className="text-[10px] text-sidebar-foreground/45 truncate capitalize">
                {roles.map((r) => getRoleLabel(r)).join(', ')}
              </p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            'transition-colors duration-150',
            collapsed ? 'justify-center px-0 h-9 w-9' : 'justify-start gap-2 h-8'
          )}
          onClick={() => signOut()}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
