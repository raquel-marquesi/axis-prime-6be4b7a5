## Diagnóstico

Consultei `profiles` + `user_roles` + `auth.users` para os dois e-mails:

| E-mail | user_id | Profile | Aprovado | Roles atuais |
|---|---|---|---|---|
| fabricio@marquesi.com.br | `2de1d246-b245-43a6-831e-ae583e1a4a55` | FABRICIO FERREIRA AGUIAR | sim, ativo | **nenhuma** |
| ti@marquesi.com.br | `e9d6e6e3-9231-4b7e-a7b5-85e318bb3a40` | ADMINISTRADOR LM | sim, ativo | **admin** (já tem) |

Ambos conseguem autenticar (last_sign_in recente), mas **fabricio** está sem nenhuma role — por isso o `ProtectedRoute` o trava fora do app. O **ti@** já é admin; se está sem acesso, é provavelmente cache/sessão antiga ou o navegador está logado com outra conta.

## O que vou fazer

1. **Inserir role `admin` para fabricio@marquesi.com.br** via tool de insert (operação de dados, não migration):
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('2de1d246-b245-43a6-831e-ae583e1a4a55', 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

2. **ti@marquesi.com.br**: já possui role admin — não precisa de alteração no banco. Vou apenas reconfirmar via SELECT após a inserção. Se ele continuar sem entrar, peço para:
   - Sair (logout) e entrar de novo, ou
   - Limpar cache do navegador / abrir em aba anônima.

3. **Validação**: rodar SELECT final mostrando as roles dos dois usuários para confirmar.

## Nada mais será alterado

- Não mexo em `profiles`, perfis de outros usuários, nem em policies/RLS.
- Não toco em `auth.users` (e-mails já confirmados, sem ban).
