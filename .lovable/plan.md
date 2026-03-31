

## Ajuste: Usar Domain-Wide Delegation para leitura das planilhas

### Problema
As 4 planilhas de origem não estão compartilhadas com `axis-integration@axis-485613.iam.gserviceaccount.com` e não podem ser. A função precisa usar **Domain-Wide Delegation (DWD)** para impersonar `raquel@marquesi.com.br` ao ler as planilhas.

### Solução
No código fornecido, a função `getGoogleAccessToken` já aceita o parâmetro `impersonateEmail`. A única mudança necessária é garantir que esse parâmetro seja sempre preenchido com `raquel@marquesi.com.br`.

**Alteração no código** (dentro do `Deno.serve`):
```typescript
// ANTES:
const impersonateEmail = Deno.env.get("GOOGLE_IMPERSONATE_EMAIL");

// DEPOIS:
const impersonateEmail = Deno.env.get("GOOGLE_IMPERSONATE_EMAIL") || "raquel@marquesi.com.br";
```

Isso garante que mesmo sem o secret `GOOGLE_IMPERSONATE_EMAIL`, a função usará DWD com seu email. O escopo `spreadsheets.readonly` já está autorizado no Domain-Wide Delegation do Workspace.

### Passo único
Criar `supabase/functions/sync-pautas-github/index.ts` com o código fornecido, hardcodando o fallback para `raquel@marquesi.com.br` na chamada de `getGoogleAccessToken`. Também adicionar a entrada em `supabase/config.toml`.

### Pré-requisito pendente
O secret `GITHUB_TOKEN` ainda precisa ser configurado para a criação de issues funcionar. Sem ele, a função lê as planilhas e insere solicitações no banco, mas não cria issues no GitHub.

