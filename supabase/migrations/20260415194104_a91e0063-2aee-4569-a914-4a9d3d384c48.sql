INSERT INTO role_permissions (role, permission_id, scope)
SELECT 'gerente', id, 'all'
FROM permissions
WHERE module IN ('financeiro', 'usuarios')
  AND action IN ('visualizar', 'criar', 'editar', 'exportar', 'deletar')
ON CONFLICT DO NOTHING;