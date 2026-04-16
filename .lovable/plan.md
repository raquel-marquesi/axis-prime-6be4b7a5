

# Diagnóstico: Usuários com IDs desalinhados entre `auth.users` e `profiles`

## Problema encontrado

Cinco usuários possuem um `profiles.user_id` que **não corresponde** ao `auth.users.id` real. Quando fazem login, o sistema busca o perfil pelo ID do auth — e não encontra nada. Resultado: nome "Usuário", sidebar vazia, zero widgets.

| Usuário | profiles.user_id (antigo) | auth.users.id (correto) |
|---|---|---|
| CAROLINA CASELLI ANTUNES | `6d3a874a...` | `ed356bd4...` |
| ADMINISTRADOR LM (ti@) | `8deec831...` | *(a verificar)* |
| VICTOR HUGO | `9bdf4197...` | *(a verificar)* |
| FABRICIO FERREIRA | `2056c272...` | *(a verificar)* |
| RAQUEL CASELLI | `35a01de6...` | *(a verificar)* |

**Causa provável**: perfis foram criados via batch-import com UUIDs gerados, depois os usuários foram convidados via `invite-user` Edge Function, que cria um **novo** `auth.users.id`. Os perfis nunca foram atualizados.

## Plano de correção

### 1. Migration SQL para realinhar os IDs

Criar uma migration que, para cada e-mail com mismatch:
- Atualize `profiles.user_id` para o `auth.users.id` correto
- Atualize `user_roles.user_id` para o novo ID
- Atualize quaisquer outras tabelas com FK para o user_id antigo (`timesheet_entries.user_id`, `process_deadlines` campos de responsável, `team_clients`, etc.)
- Delete o registro antigo de `profiles` se houver duplicata

### 2. Prevenir reincidência no `invite-user` Edge Function

Verificar a Edge Function `invite-user` para garantir que, ao criar um auth user, ela atualize o `profiles.user_id` existente em vez de deixar o ID antigo.

### 3. Verificação pós-fix

Query de validação confirmando que todos os `profiles.user_id` existem em `auth.users`.

---

**Seção técnica — tabelas afetadas pela mudança de user_id:**
- `profiles` (user_id PK/FK)
- `user_roles` (user_id FK)
- `user_permission_overrides` (user_id FK)
- `timesheet_entries` (user_id)
- `calendar_events` (user_id)
- `bonus_entries` (user_id)
- Qualquer outra tabela com coluna `user_id` referenciando profiles

A migration usará transação para garantir atomicidade.

