

## Adicionar campo Cliente no AccountFormDialog

### Mudança

Adicionar um campo `client_id` (Select dropdown) no formulário de Conta, usando `useClientsSafe` para popular a lista. O campo é opcional — uma conta pode existir sem vínculo direto com cliente.

### Implementação

**Arquivo: `src/components/financeiro/AccountFormDialog.tsx`**

1. Importar `useClientsSafe` de `@/hooks/useClientsSafe`
2. Adicionar `client_id` ao schema zod como `z.string().optional()`
3. Incluir `client_id` nos `defaultValues` (usando `account?.client_id || ''`)
4. Adicionar um `FormField` com `Select` entre o campo "Nome da Conta" e a row "Tipo/Status", listando os clientes com `nome || razao_social` como label
5. No `onSubmit`, usar `values.client_id || null` no payload (em vez do hardcoded `account?.client_id || null`)

O dropdown mostrará `nome` para PF e `razao_social` para PJ, com fallback para o outro campo se um estiver vazio.

