export type AppRole = string;
export type AreaSetor = 'execucao' | 'contingencia' | 'decisao' | 'acoes_coletivas' | 'administrativo' | 'rh' | 'financeiro_area' | 'geral' | 'agendamento' | 'civel' | 'digitacao' | 'laudos';

export type PermissionModule = 'crm' | 'processos' | 'timesheet' | 'financeiro' | 'agenda' | 'relatorios' | 'solicitacoes' | 'premiacao' | 'usuarios';
export type PermissionAction = 'visualizar' | 'criar' | 'editar' | 'deletar' | 'exportar' | 'configurar';
export type PermissionScope = 'own' | 'team' | 'all';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  area: AreaSetor | null;
  is_active: boolean;
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  reports_to: string | null;
  sigla?: string | null;
  cpf?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  conta_digito?: string | null;
  pix_key?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  dashboard_config?: { widgets?: string[] } | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
  roles: AppRole[];
}

// Default labels for known system roles
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  lider: 'Líder de Equipe',
  calculista: 'Calculista',
  financeiro: 'Financeiro',
  assistente_financeiro: 'Assistente Financeiro',
  socio: 'Sócio',
  coordenador: 'Coordenador',
  usuario: 'Usuário',
  advogado: 'Advogado',
  assistente: 'Assistente',
  consultor: 'Consultor',
};

// Kept for backward compat but prefer dynamic from custom_roles table
export const AVAILABLE_ROLES: string[] = [
  'admin', 'gerente', 'socio', 'coordenador', 'lider',
  'calculista', 'financeiro', 'assistente_financeiro', 'assistente',
];

export const CONFIGURABLE_ROLES: string[] = [
  'admin', 'gerente', 'socio', 'coordenador', 'lider',
  'calculista', 'financeiro', 'assistente_financeiro', 'assistente',
];

export const AREA_LABELS: Record<AreaSetor, string> = {
  execucao: 'Execução',
  contingencia: 'Contingência Decisão',
  decisao: 'Contingência Inicial',
  acoes_coletivas: 'Ações Coletivas',
  administrativo: 'Administrativo',
  rh: 'RH',
  financeiro_area: 'Financeiro',
  geral: 'Geral',
  agendamento: 'Agendamento',
  civel: 'Cível',
  digitacao: 'Digitação',
  laudos: 'Laudos',
};

export const MODULE_LABELS: Record<PermissionModule, string> = {
  crm: 'CRM (Clientes)',
  processos: 'Processos',
  timesheet: 'Timesheet',
  financeiro: 'Financeiro',
  agenda: 'Agenda',
  relatorios: 'Relatórios',
  solicitacoes: 'Prazos',
  premiacao: 'Premiação',
  usuarios: 'Usuários',
};

export const ACTION_LABELS: Record<PermissionAction, string> = {
  visualizar: 'Visualizar',
  criar: 'Criar',
  editar: 'Editar',
  deletar: 'Deletar',
  exportar: 'Exportar',
  configurar: 'Configurar',
};

export const ALL_MODULES: PermissionModule[] = ['crm', 'processos', 'timesheet', 'financeiro', 'agenda', 'relatorios', 'solicitacoes', 'premiacao', 'usuarios'];
export const ALL_ACTIONS: PermissionAction[] = ['visualizar', 'criar', 'editar', 'deletar', 'exportar', 'configurar'];