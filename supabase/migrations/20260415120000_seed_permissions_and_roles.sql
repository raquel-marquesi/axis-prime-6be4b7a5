DO $$
BEGIN

-- ============================================================
-- Seed: permissions table (all module × action combinations)
-- ============================================================
INSERT INTO permissions (module, action)
VALUES
  ('crm','visualizar'), ('crm','criar'), ('crm','editar'), ('crm','deletar'), ('crm','exportar'), ('crm','configurar'),
  ('processos','visualizar'), ('processos','criar'), ('processos','editar'), ('processos','deletar'), ('processos','exportar'), ('processos','configurar'),
  ('timesheet','visualizar'), ('timesheet','criar'), ('timesheet','editar'), ('timesheet','deletar'), ('timesheet','exportar'), ('timesheet','configurar'),
  ('financeiro','visualizar'), ('financeiro','criar'), ('financeiro','editar'), ('financeiro','deletar'), ('financeiro','exportar'), ('financeiro','configurar'),
  ('agenda','visualizar'), ('agenda','criar'), ('agenda','editar'), ('agenda','deletar'), ('agenda','exportar'), ('agenda','configurar'),
  ('relatorios','visualizar'), ('relatorios','criar'), ('relatorios','editar'), ('relatorios','deletar'), ('relatorios','exportar'), ('relatorios','configurar'),
  ('solicitacoes','visualizar'), ('solicitacoes','criar'), ('solicitacoes','editar'), ('solicitacoes','deletar'), ('solicitacoes','exportar'), ('solicitacoes','configurar'),
  ('premiacao','visualizar'), ('premiacao','criar'), ('premiacao','editar'), ('premiacao','deletar'), ('premiacao','exportar'), ('premiacao','configurar'),
  ('usuarios','visualizar'), ('usuarios','criar'), ('usuarios','editar'), ('usuarios','deletar'), ('usuarios','exportar'), ('usuarios','configurar')
ON CONFLICT (module, action) DO NOTHING;

-- ============================================================
-- Seed: custom_roles (system roles)
-- ============================================================
INSERT INTO custom_roles (name, label, is_system)
VALUES
  ('admin',               'Administrador',         true),
  ('gerente',             'Gerente',                true),
  ('socio',               'Sócio',                  true),
  ('coordenador',         'Coordenador',            true),
  ('lider',               'Líder de Equipe',        true),
  ('calculista',          'Calculista',             true),
  ('financeiro',          'Financeiro',             true),
  ('assistente_financeiro','Assistente Financeiro', true),
  ('assistente',          'Assistente',             true),
  ('usuario',             'Usuário',                true),
  ('advogado',            'Advogado',               true),
  ('consultor',           'Consultor',              true)
ON CONFLICT (name) DO UPDATE SET label = EXCLUDED.label, is_system = EXCLUDED.is_system;

-- ============================================================
-- Seed: role_permissions
-- ============================================================

-- ---------- ADMIN: tudo com scope 'all' ----------
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'admin', id, 'all' FROM permissions
ON CONFLICT (role, permission_id) DO UPDATE SET scope = 'all';

-- ---------- GERENTE ----------
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'gerente', id, 'all' FROM permissions
WHERE (module, action) IN (
  ('crm','visualizar'), ('crm','criar'), ('crm','editar'), ('crm','exportar'), ('crm','configurar'),
  ('processos','visualizar'), ('processos','criar'), ('processos','editar'), ('processos','deletar'), ('processos','exportar'),
  ('timesheet','visualizar'), ('timesheet','editar'), ('timesheet','exportar'),
  ('financeiro','visualizar'),
  ('agenda','visualizar'), ('agenda','criar'), ('agenda','editar'),
  ('relatorios','visualizar'), ('relatorios','exportar'),
  ('solicitacoes','visualizar'), ('solicitacoes','criar'), ('solicitacoes','editar'),
  ('premiacao','visualizar'),
  ('usuarios','visualizar'), ('usuarios','criar'), ('usuarios','editar'), ('usuarios','configurar')
)
ON CONFLICT (role, permission_id) DO UPDATE SET scope = 'all';

-- ---------- SÓCIO (mesmos que gerente) ----------
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'socio', id, 'all' FROM permissions
WHERE (module, action) IN (
  ('crm','visualizar'), ('crm','criar'), ('crm','editar'), ('crm','exportar'), ('crm','configurar'),
  ('processos','visualizar'), ('processos','criar'), ('processos','editar'), ('processos','deletar'), ('processos','exportar'),
  ('timesheet','visualizar'), ('timesheet','editar'), ('timesheet','exportar'),
  ('financeiro','visualizar'),
  ('agenda','visualizar'), ('agenda','criar'), ('agenda','editar'),
  ('relatorios','visualizar'), ('relatorios','exportar'),
  ('solicitacoes','visualizar'), ('solicitacoes','criar'), ('solicitacoes','editar'),
  ('premiacao','visualizar'),
  ('usuarios','visualizar'), ('usuarios','criar'), ('usuarios','editar'), ('usuarios','configurar')
)
ON CONFLICT (role, permission_id) DO UPDATE SET scope = 'all';

-- ---------- COORDENADOR (scope team) ----------
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'coordenador', id, 'team' FROM permissions
WHERE (module, action) IN (
  ('crm','visualizar'), ('crm','criar'), ('crm','editar'), ('crm','exportar'),
  ('processos','visualizar'), ('processos','criar'), ('processos','editar'),
  ('timesheet','visualizar'), ('timesheet','editar'),
  ('agenda','visualizar'), ('agenda','criar'), ('agenda','editar'),
  ('relatorios','visualizar'),
  ('solicitacoes','visualizar'), ('solicitacoes','criar'), ('solicitacoes','editar'),
  ('premiacao','visualizar'),
  ('usuarios','visualizar'), ('usuarios','editar')
)
ON CONFLICT (role, permission_id) DO UPDATE SET scope = 'team';

-- ---------- LÍDER (scope team) ----------
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'lider', id, 'team' FROM permissions
WHERE (module, action) IN (
  ('crm','visualizar'), ('crm','editar'),
  ('processos','visualizar'), ('processos','criar'), ('processos','editar'),
  ('timesheet','visualizar'), ('timesheet','editar'),
  ('agenda','visualizar'), ('agenda','criar'),
  ('relatorios','visualizar'),
  ('solicitacoes','visualizar'), ('solicitacoes','criar'), ('solicitacoes','editar'),
  ('premiacao','visualizar'),
  ('usuarios','visualizar')
)
ON CONFLICT (role, permission_id) DO UPDATE SET scope = 'team';

-- ---------- FINANCEIRO ----------
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'financeiro', id, 'all' FROM permissions
WHERE (module, action) IN (
  ('financeiro','visualizar'), ('financeiro','criar'), ('financeiro','editar'), ('financeiro','exportar'),
  ('solicitacoes','visualizar'),
  ('relatorios','visualizar'), ('relatorios','exportar')
)
ON CONFLICT (role, permission_id) DO UPDATE SET scope = 'all';

INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'financeiro', id, 'own' FROM permissions
WHERE (module, action) IN (
  ('crm','visualizar'),
  ('processos','visualizar'),
  ('timesheet','visualizar'), ('timesheet','criar'),
  ('agenda','visualizar'),
  ('premiacao','visualizar')
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ---------- ASSISTENTE FINANCEIRO ----------
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'assistente_financeiro', id, 'all' FROM permissions
WHERE (module, action) IN (
  ('financeiro','visualizar'),
  ('solicitacoes','visualizar'),
  ('relatorios','visualizar')
)
ON CONFLICT (role, permission_id) DO UPDATE SET scope = 'all';

INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'assistente_financeiro', id, 'own' FROM permissions
WHERE (module, action) IN (
  ('crm','visualizar'),
  ('processos','visualizar'),
  ('timesheet','visualizar'), ('timesheet','criar'),
  ('agenda','visualizar'),
  ('premiacao','visualizar')
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ---------- CALCULISTA (scope own) ----------
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'calculista', id, 'own' FROM permissions
WHERE (module, action) IN (
  ('crm','visualizar'),
  ('processos','visualizar'), ('processos','criar'), ('processos','editar'),
  ('timesheet','visualizar'), ('timesheet','criar'), ('timesheet','editar'),
  ('agenda','visualizar'), ('agenda','criar'),
  ('premiacao','visualizar')
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ---------- ASSISTENTE (scope own) ----------
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'assistente', id, 'own' FROM permissions
WHERE (module, action) IN (
  ('crm','visualizar'),
  ('processos','visualizar'), ('processos','criar'),
  ('timesheet','visualizar'), ('timesheet','criar'),
  ('agenda','visualizar'), ('agenda','criar'),
  ('premiacao','visualizar')
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ---------- ADVOGADO (scope own) ----------
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'advogado', id, 'own' FROM permissions
WHERE (module, action) IN (
  ('crm','visualizar'),
  ('processos','visualizar'), ('processos','criar'), ('processos','editar'),
  ('timesheet','visualizar'), ('timesheet','criar'),
  ('agenda','visualizar'), ('agenda','criar'),
  ('premiacao','visualizar')
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ---------- CONSULTOR (scope own) ----------
INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'consultor', id, 'own' FROM permissions
WHERE (module, action) IN (
  ('crm','visualizar'),
  ('processos','visualizar'),
  ('timesheet','visualizar'), ('timesheet','criar'),
  ('agenda','visualizar'),
  ('premiacao','visualizar')
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ---------- USUÁRIO: sem permissões por default ----------

EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;
