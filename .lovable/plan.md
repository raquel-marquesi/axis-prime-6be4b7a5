

## Diagnóstico da Conexão com a Planilha

### Planilha identificada
A planilha `11tvMSgLv0AJ40x3r6IW3VU3aZeCZGnkEj8pAdaD6Sbc` é usada pela Edge Function **`sync-email-agendamentos`**, que sincroniza solicitações de cálculo extraídas de e-mails organizadas por abas de clientes.

### Problema encontrado
A função retorna erro **500**: `GOOGLE_SERVICE_ACCOUNT_JSON not set`.

O secret `GOOGLE_SERVICE_ACCOUNT_JSON` **não está configurado** nas Edge Functions do Supabase. Este mesmo secret é necessário por 13 Edge Functions (google-calendar, google-drive, google-gmail, sync-sheets, etc.) — é por isso que o google-calendar também retorna 401.

### O que precisa ser feito

1. **Configurar o secret `GOOGLE_SERVICE_ACCOUNT_JSON`** no painel do Supabase (Edge Functions > Secrets) com o JSON da conta de serviço do Google que tem acesso às planilhas e APIs do Google Workspace.

2. **Onde obter o JSON**: No Google Cloud Console do projeto que já é utilizado (provavelmente o workspace `marquesi.adv.br`):
   - Acessar **IAM & Admin > Service Accounts**
   - Localizar a conta de serviço existente (ex: `integracao@marquesi.adv.br` ou similar)
   - Gerar uma nova chave JSON (ou usar a existente)
   - O JSON contém `client_email`, `private_key`, `project_id`, etc.

3. **Após configurar o secret**, todas as 13 funções que dependem dele passarão a funcionar, incluindo:
   - `sync-email-agendamentos` (esta planilha)
   - `google-calendar` (que está retornando 401)
   - `google-drive`, `google-gmail`, `sync-sheets`, etc.

### Resumo técnico

| Item | Valor |
|------|-------|
| Planilha ID | `11tvMSgLv0AJ40x3r6IW3VU3aZeCZGnkEj8pAdaD6Sbc` |
| Edge Function | `sync-email-agendamentos` |
| Secret faltante | `GOOGLE_SERVICE_ACCOUNT_JSON` |
| Funções afetadas | 13 Edge Functions |
| Escopo necessário | `spreadsheets`, `calendar`, `drive`, `gmail` (domain-wide delegation) |

Após você fornecer o JSON da conta de serviço, eu configuro o secret e testo a conexão com a planilha.

