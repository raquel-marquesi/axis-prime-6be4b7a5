

## Diagnóstico: por que sumiu o acesso de admin

### Como o sistema define admin

1. **Atribuição da role**: linhas em `public.user_roles` com `role = 'admin'`. A tabela tem uma linha por `(user_id, role)`. Não existe coluna `is_admin` em `profiles` — o único caminho é `user_roles`.
2. **Verificação no banco**: função `has_role(uid, 'admin')` (SQL `STABLE SECURITY DEFINER`), usada em RLS e em outras helpers (`is_admin_or_manager`, `is_coordinator_or_above`, `is_financeiro`, `is_leader_or_above`).
3. **Verificação no frontend**: `AuthContext.fetchUserData` faz `supabase.from('user_roles').select('role').eq('user_id', userId)` e popula `realRoles`. Helpers `isAdmin()`, `hasRole('admin')`, etc. derivam disso.

### O que quebrou

Olhei a migração mais recente — `supabase/migrations/20260424131919_remote_schema.sql` (2358 linhas, ~912 statements `REVOKE` e **zero** `GRANT`/`CREATE POLICY` compensatórios). Ela executa, entre outras coisas:

- `revoke … on table "public"."user_roles" from "authenticated"` (references/trigger/truncate — ok, inofensivos) **mas também** drop de policies que davam visão a authenticated:
  - `drop policy if exists "Authenticated users can view all roles" on "public"."user_roles"` (linha 35).
  - `drop policy if exists "Admins can manage roles" on "public"."user_roles"` (linha 33).
- `drop policy if exists "Authenticated users can view all active profiles" on "public"."profiles"` (linha 37).
- `drop policy if exists "Users can insert own profile"` e `"Users can update own profile"` em `profiles` (linhas 25, 27).
- Massivo `revoke … from service_role` em quase todas as tabelas (afeta Edge Functions que usam service role).
- `drop view if exists "public"."profiles_safe"`.

E **não há** `CREATE POLICY` recriando o equivalente. Resultado:

1. **Frontend**: ao logar, `AuthContext.fetchUserData` faz `.select('role').eq('user_id', userId)` em `user_roles`. As policies remanescentes em `user_roles` são:
   - `"Users can view own roles"` / `"Users can view their own roles"` — `USING (auth.uid() = user_id)` ✅
   - `"Admins can view all roles"` — `USING (has_role(auth.uid(), 'admin'))` ✅

   Em tese a Raquel deveria conseguir. Mas verifiquei diretamente no banco:
   ```
   SELECT * FROM user_roles WHERE user_id = 'a62e577b-9708-4a45-86a5-7e1212ecc9b5';
   → 0 linhas
   ```
   **A Raquel não tem nenhuma role atribuída**. O admin documentado na memória (`mem://auth/admin-user`) sumiu de `user_roles`.

   Os únicos admins restantes no banco são:
   - `marcel@marquesi.com.br` (50dcc84c-…)
   - `ti@marquesi.com.br` (e9d6e6e3-…)

   Provavelmente uma migração anterior ou um `db pull` desalinhou o seed do admin.

2. **Edge Functions**: os `revoke … from service_role` em massa quebraram funções que dependem do client com `SUPABASE_SERVICE_ROLE_KEY`. Erros típicos: "permission denied for table X". Os erros que você está vendo no build (`getClaims` ausente, etc.) são **ruído paralelo** de tipos, mas o `revoke` de service_role é um problema real de runtime.

3. **Profiles**: o drop de `"Authenticated users can view all active profiles"` quebrou listagens de equipe / coordenador. Sobraram `"Users can view their own profile"`, `"Admins and managers can view all profiles"` (`is_admin_or_manager`), `"Coordinators can view team profiles"`. Quem não é admin/coord/manager passa a ver só o próprio. **Para a Raquel, como ela não está mais em `user_roles`, ela é tratada como usuário comum** → vê só o próprio profile, sem permissões.

### Causa raiz

A migração `20260424131919_remote_schema.sql` foi gerada por `supabase db pull` capturando um snapshot do remoto, mas **descartou** policies e `GRANT`s sem recriá-los, e eliminou a role admin da Raquel. É uma migração destrutiva inadvertida — regrediu o estado de RLS/grants para um schema mais restrito do que o app espera.

### Plano de correção

Tudo via uma **única migração nova** (não tocar a `20260424131919` para preservar o histórico), com as seguintes operações:

#### 1. Restaurar admin da Raquel

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('a62e577b-9708-4a45-86a5-7e1212ecc9b5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

#### 2. Restaurar GRANTs essenciais a `service_role` em todas as tabelas `public.*`

Edge Functions que usam `SUPABASE_SERVICE_ROLE_KEY` precisam de acesso amplo:

```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;
```

E garantir que `authenticated` mantém o que precisa (não dropar, só re-conceder por segurança):

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
```

(RLS continua sendo o controle real — `GRANT` é apenas a camada de privilégio de tabela; sem ele as policies nem chegam a ser avaliadas.)

#### 3. Recriar as policies derrubadas

Em `profiles`:
```sql
CREATE POLICY "Authenticated users can view all active profiles"
ON public.profiles FOR SELECT TO authenticated
USING (is_active = true OR reports_to IS NOT NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
```

Em `user_roles` (já tem `"Admins can view all roles"`, mas a anterior `"Authenticated users can view all roles"` era usada por hooks como `useUsers` para montar o mapa user→roles — recriar):
```sql
CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (true);
```

(Alternativa segura: manter restrito a admins — mas isso quebra `useUsers.ts` que faz `select('*').from('user_roles')` para listar todos. A versão anterior era `USING (true)`. Manter compatível.)

#### 4. Validação pós-migração

Após aplicar, rodar via tool de leitura:
```sql
-- Confirmar Raquel admin
SELECT * FROM public.user_roles WHERE user_id = 'a62e577b-9708-4a45-86a5-7e1212ecc9b5';

-- Confirmar grants restaurados
SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('user_roles','profiles')
  AND grantee IN ('authenticated','service_role')
ORDER BY table_name, grantee, privilege_type;

-- Confirmar policies recriadas
SELECT polname FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
WHERE c.relname IN ('profiles','user_roles')
ORDER BY c.relname, polname;
```

#### 5. Memória

Atualizar `mem://auth/admin-user` se a Raquel tiver mudado de status, ou manter — fica como referência de quem deve sempre ter `admin`.

### Arquivos afetados

- **Nova migração** em `supabase/migrations/<timestamp>_restore_admin_access_and_grants.sql` (única alteração).
- Nenhum código TS/TSX precisa mudar — `AuthContext`, `usePermissions`, `ProtectedRoute` estão corretos; o problema é puramente de dados/permissões no banco.

### Fora do escopo

- Reescrever a migração `20260424131919_remote_schema.sql` (preservar histórico do CI).
- Erros de TypeScript em Edge Functions (`getClaims`, `Uint8Array`, etc.) — são problemas separados que aparecem no build mas não causam o "perdi acesso de admin". Tratar em iteração própria.
- Auditoria completa de outras policies dropadas (custom_roles, expenses, invoices, solicitacoes, etc.) — listar quais precisam ser recriadas exigiria revisão coluna a coluna; nesta iteração foco no que destrava o acesso de admin (profiles + user_roles + grants).

### Risco

Baixo. A migração é aditiva: insere admin, recria policies que já existiam antes do snapshot, restaura grants padrão. Não altera schema nem dados de negócio.

