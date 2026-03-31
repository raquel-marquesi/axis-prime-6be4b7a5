

## Desativar criação de issues no GitHub — sync-pautas-github

### O que muda

Remover todo o código relacionado à criação de issues no GitHub da Edge Function `sync-pautas-github/index.ts`, mantendo intacta a sincronização com o banco de dados (solicitações, deadlines, SLA, atribuição).

### Código a remover/modificar

**`supabase/functions/sync-pautas-github/index.ts`**

1. **Remover constantes GitHub** (linhas 20-21): `GITHUB_REPO`, `GITHUB_API`
2. **Remover funções GitHub** (linhas 158-231): `ensureGithubLabels`, `createGithubIssue`, `buildIssueBody`
3. **Remover leitura do `GITHUB_TOKEN`** (linha 340)
4. **Remover bloco de bootstrap de labels** (linhas 380-394)
5. **Remover skip por `issueNumber` existente** (linha 531): `if (existing?.issueNumber) continue;` — mudar para skip apenas se `existing` já tem registro (dedup normal)
6. **Remover campo `issueNumber` do existingMap** (linhas 488-495): simplificar para guardar apenas o `id`
7. **Remover todo o bloco de criação de issue** (linhas 631-701): desde `if (!githubToken)` até o `update` de `extracted_details` com `github_issue_number`
8. **Remover `github_issue_number: null`** do `extracted_details` no insert (linha 590)
9. **Remover contadores** `totalIssues` e referências a `issues_created` nos logs/resposta

### O que permanece inalterado

- Leitura das 4 planilhas via Google Sheets API
- Inserção/atualização de `solicitacoes`
- Resolução de `process_id`, `client_id`, `calculation_type_id`
- Aplicação de SLA fallback
- Criação de `process_deadlines`
- Atribuição automática via `assign_calculation`
- Logs em `sync_logs`

### Resultado

A função continua sincronizando planilhas → banco de dados normalmente, mas nenhuma issue será criada no GitHub. As issues existentes no repositório permanecerão lá (podem ser fechadas/deletadas manualmente se desejado).

