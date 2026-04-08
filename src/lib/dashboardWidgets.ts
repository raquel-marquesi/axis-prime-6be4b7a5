export interface DashboardWidgetDef {
  id: string;
  label: string;
  description: string;
  /** Roles that can see this widget. Empty = everyone */
  requiredRoles: string[];
  /** Roles for which this widget is enabled by default */
  defaultForRoles: string[];
}

/**
 * Central registry of all dashboard widgets.
 * `requiredRoles: []` means available to everyone.
 * `socio` has access to ALL widgets (handled in filtering logic).
 */
export const DASHBOARD_WIDGETS: DashboardWidgetDef[] = [
  {
    id: 'calendar',
    label: 'Calendário Interno',
    description: 'Agenda interna com eventos e prazos',
    requiredRoles: [],
    defaultForRoles: ['usuario', 'calculista', 'assistente', 'coordenador', 'lider', 'gerente', 'admin', 'socio'],
  },
  {
    id: 'bonus',
    label: 'Bônus / Premiação',
    description: 'Gauge de progresso do bônus mensal',
    requiredRoles: ['usuario', 'calculista', 'assistente', 'coordenador', 'lider', 'gerente', 'admin', 'socio'],
    defaultForRoles: ['usuario', 'calculista', 'assistente', 'coordenador', 'lider', 'gerente', 'admin', 'socio'],
  },
  {
    id: 'deadlines_pending',
    label: 'Prazos Pendentes',
    description: 'Contagem de prazos pendentes nos próximos 7 dias',
    requiredRoles: [],
    defaultForRoles: ['usuario', 'calculista', 'assistente', 'coordenador', 'lider', 'gerente', 'admin', 'socio'],
  },
  {
    id: 'deadlines_overdue',
    label: 'Prazos Atrasados',
    description: 'Contagem de prazos em atraso',
    requiredRoles: [],
    defaultForRoles: ['coordenador', 'lider', 'gerente', 'admin', 'socio'],
  },
  {
    id: 'producao',
    label: 'Produção',
    description: 'Resumo de produção da equipe',
    requiredRoles: ['coordenador', 'lider', 'gerente', 'admin', 'socio'],
    defaultForRoles: ['coordenador', 'lider', 'gerente', 'admin', 'socio'],
  },
  {
    id: 'goal_progress',
    label: 'Meta da Equipe',
    description: 'Progresso em relação à meta mensal',
    requiredRoles: ['coordenador', 'lider', 'gerente', 'admin', 'socio'],
    defaultForRoles: ['coordenador', 'lider', 'socio'],
  },
  {
    id: 'deadlines_by_member',
    label: 'Prazos por Membro',
    description: 'Status de prazos de cada membro da equipe',
    requiredRoles: ['coordenador', 'lider', 'gerente', 'admin', 'socio'],
    defaultForRoles: ['coordenador', 'lider', 'socio'],
  },
  {
    id: 'contracts_expiring',
    label: 'Contratos a Vencer',
    description: 'Contratos que vencem em 30, 60 e 90 dias',
    requiredRoles: ['gerente', 'admin', 'socio', 'financeiro', 'assistente_financeiro'],
    defaultForRoles: ['gerente', 'admin', 'socio', 'financeiro', 'assistente_financeiro'],
  },
  {
    id: 'google_calendar',
    label: 'Google Calendar',
    description: 'Integração com Google Calendar',
    requiredRoles: ['coordenador', 'lider', 'gerente', 'admin', 'socio'],
    defaultForRoles: ['coordenador', 'lider', 'gerente', 'admin', 'socio'],
  },
  {
    id: 'recebiveis',
    label: 'Recebíveis',
    description: 'Resumo de valores a receber',
    requiredRoles: ['financeiro', 'assistente_financeiro', 'admin', 'socio'],
    defaultForRoles: ['financeiro', 'assistente_financeiro', 'socio'],
  },
  {
    id: 'agenda_faturamento',
    label: 'Agenda de Faturamento',
    description: 'Próximas datas de faturamento',
    requiredRoles: ['financeiro', 'assistente_financeiro', 'admin', 'socio'],
    defaultForRoles: ['financeiro', 'assistente_financeiro', 'socio'],
  },
  {
    id: 'rentabilidade',
    label: 'Rentabilidade',
    description: 'Gráfico de rentabilidade por cliente',
    requiredRoles: ['financeiro', 'assistente_financeiro', 'admin', 'socio'],
    defaultForRoles: ['financeiro', 'assistente_financeiro', 'socio'],
  },
  {
    id: 'premiacao_faturamento',
    label: 'Premiação vs Faturamento',
    description: 'Comparativo entre premiação e faturamento',
    requiredRoles: ['financeiro', 'assistente_financeiro', 'admin', 'socio'],
    defaultForRoles: ['financeiro', 'assistente_financeiro', 'socio'],
  },
  {
    id: 'projecao_receita',
    label: 'Projeção de Receita',
    description: 'Projeção de receita futura',
    requiredRoles: ['financeiro', 'assistente_financeiro', 'admin', 'socio'],
    defaultForRoles: ['financeiro', 'assistente_financeiro', 'socio'],
  },
  {
    id: 'clientes_ativos',
    label: 'Clientes Ativos',
    description: 'Contagem e distribuição de clientes ativos',
    requiredRoles: ['financeiro', 'assistente_financeiro', 'admin', 'socio'],
    defaultForRoles: ['financeiro', 'assistente_financeiro', 'socio'],
  },
];

/**
 * Get widgets available for the given roles.
 * `socio` gets access to ALL widgets.
 */
export function getAvailableWidgets(roles: string[]): DashboardWidgetDef[] {
  if (roles.includes('socio')) return DASHBOARD_WIDGETS;
  
  return DASHBOARD_WIDGETS.filter(w => {
    if (w.requiredRoles.length === 0) return true;
    return w.requiredRoles.some(r => roles.includes(r));
  });
}

/**
 * Get the default widget IDs for a set of roles.
 */
export function getDefaultWidgetIds(roles: string[]): string[] {
  return DASHBOARD_WIDGETS
    .filter(w => w.defaultForRoles.some(r => roles.includes(r)))
    .map(w => w.id);
}
