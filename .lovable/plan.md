

## Corrigir Equipes: membros não aparecem

### Problema

A página de Equipes consulta a view `profiles_safe` pedindo as colunas `id` e `reports_to`, mas essa view só expõe `user_id, full_name, email, area, sigla, is_active`. Como resultado, a query falha silenciosamente e retorna zero perfis — por isso nenhum membro aparece em nenhuma equipe.

Os dados existem corretamente no banco: 86 membros vinculados a 11 líderes via `reports_to`, e 58 registros em `team_clients`.

### Solução

Atualizar a view `profiles_safe` para incluir `id` e `reports_to`, que não são dados sensíveis (são UUIDs internos de hierarquia).

### 1. Migration SQL

Recriar a view `profiles_safe` adicionando `id` e `reports_to`:

```sql
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker=on) AS
SELECT
  id,
  user_id,
  full_name,
  email,
  area,
  sigla,
  is_active,
  reports_to
FROM public.profiles;
```

### 2. Ajustar `src/pages/Equipes.tsx`

Nenhuma alteração necessária no componente — ele já faz a query correta (`id, user_id, full_name, sigla, area, reports_to, is_active`). Com a view corrigida, os dados passarão a fluir normalmente.

### Resultado

- Cards de equipe mostrarão os membros subordinados a cada líder
- A contagem de membros e clientes ficará correta
- Nenhum dado sensível (cpf, banco, conta) será exposto pela view

