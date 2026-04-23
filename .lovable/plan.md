

## Restringir RLS de `invoices` e `expenses` por role

### Objetivo
Substituir as políticas abertas (`USING (true)`) atualmente aplicadas em `public.invoices` e `public.expenses` por políticas restritivas que só permitem acesso (leitura e escrita) a usuários com um dos roles: `admin`, `socio`, `gerente`, `financeiro`, `assistente_financeiro`. Qualquer outro role autenticado perde leitura e escrita nessas tabelas.

### Nova migration

**Arquivo**: `supabase/migrations/<timestamp>_restrict_invoices_expenses_rls.sql`

Conteúdo:

```sql
-- Garante RLS habilitado
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ===== INVOICES =====
-- Remove TODAS as políticas pré-existentes (abertas e legadas)
DROP POLICY IF EXISTS "Allow authenticated users full access to invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated finance leaders coordinators can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Finance and leaders can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Finance and leaders can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Only admins can delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "Finance roles full access invoices" ON public.invoices;

CREATE POLICY "Finance roles full access invoices"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'socio')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'assistente_financeiro')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'socio')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'assistente_financeiro')
  );

-- ===== EXPENSES =====
DROP POLICY IF EXISTS "Allow authenticated users full access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "Finance roles full access expenses" ON public.expenses;

CREATE POLICY "Finance roles full access expenses"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'socio')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'assistente_financeiro')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'socio')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'assistente_financeiro')
  );
```

### Detalhes técnicos

- **Função `public.has_role(uuid, app_role)`**: já existe no projeto, é `STABLE SECURITY DEFINER`, evita recursão de RLS (padrão consolidado em `mem://security/rls-recursion-prevention`).
- **Idempotência**: cada `CREATE POLICY` é precedido por `DROP POLICY IF EXISTS` com o mesmo nome, além dos drops das políticas legadas conhecidas (mapeadas em migrations anteriores: `20260407185014_*.sql`, `20260413194800_rls_hardening.sql`, `20260414120000_ensure_all_rls_policies.sql`).
- **Política única `FOR ALL`**: cobre `SELECT`, `INSERT`, `UPDATE`, `DELETE` em uma só declaração — atende ao pedido de uma policy `SELECT/ALL` por tabela. `USING` controla leitura/update/delete; `WITH CHECK` controla insert/update.
- **Edge functions**: continuam funcionando porque usam `SUPABASE_SERVICE_ROLE_KEY`, que bypass de RLS.
- **Regra de memória**: `mem://ops/edge-functions-and-migrations` exige migration versionada para qualquer mudança de policy — atendido.

### Impacto no frontend

Hooks afetados (`useInvoices`, `useExpenses`, `useFinanceReports`, `useTreasury`, `useDREReport`, `useBoletos`, etc.) executam queries via SDK com a sessão do usuário. Usuários **sem** um dos roles autorizados:

- Não verão registros em `invoices` / `expenses` (queries retornam `[]` em vez de erro).
- Mutations (`createInvoice`, `updateInvoice`, `deleteInvoice`, equivalentes em expenses) retornarão erro de RLS.

Isso é o comportamento desejado — a página `/financeiro` já é navegável apenas por roles financeiros pelo menu lateral, então o impacto prático é limitado a esconder dados sensíveis caso um usuário comum acesse a rota diretamente.

### Verificação pós-migration

Após aplicar, rodar `supabase--linter` para confirmar ausência de warnings de RLS. As RPCs financeiras (`get_financial_dre_summary`, `get_cashflow_summary`, `get_cost_center_summary`, `get_treasury_summary`) são `SECURITY DEFINER` e continuarão acessíveis a qualquer usuário autenticado — se quiser também restringir essas RPCs por role, é uma mudança separada (fora do escopo deste pedido).

### Arquivos afetados

- **Novo**: `supabase/migrations/<timestamp>_restrict_invoices_expenses_rls.sql`
- Nenhum arquivo de frontend é alterado.

### Fora do escopo

- Restringir as RPCs `SECURITY DEFINER` de finanças por role.
- Esconder a entrada do menu `/financeiro` para roles não-financeiros (já tratado em `usePermissions`).
- Mensagens de UI específicas para "acesso negado" nas tabelas financeiras.

