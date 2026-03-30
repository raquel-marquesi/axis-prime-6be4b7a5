# Guia de Configuração — Axis Prime

Referência completa de todos os secrets, permissões e integrações externas necessárias para o projeto funcionar corretamente após migração.

---

## 1. Variáveis de Ambiente — Frontend (`.env`)

Arquivo `.env` na raiz do projeto (já commitado com valores públicos):

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `VITE_SUPABASE_URL` | `https://pojnrtgqigouahmdanze.supabase.co` | URL do projeto Supabase |
| `VITE_SUPABASE_PROJECT_ID` | `pojnrtgqigouahmdanze` | ID do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | *(anon key — ver painel Supabase)* | Chave pública para o cliente React |

---

## 2. Secrets das Edge Functions — Supabase

Configurar em: **Supabase Dashboard → Edge Functions → Secrets**

| Secret | Onde obter | Usado por |
|--------|-----------|-----------|
| `SUPABASE_URL` | Painel Supabase → Project Settings → API | Todas as funções |
| `SUPABASE_ANON_KEY` | Painel Supabase → Project Settings → API | google-calendar, google-gmail, google-drive, invite-user, delete-user, sync-clients-sheet, cross-check-calendar |
| `SUPABASE_SERVICE_ROLE_KEY` | Painel Supabase → Project Settings → API | Maioria das funções (operações privilegiadas no banco) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Cloud Console → IAM → Service Accounts → chave JSON | google-calendar, google-gmail, google-drive, sync-sheets, sync-clients-sheet, extract-contract, cross-check-calendar, bulk-import-data |
| `LOVABLE_API_KEY` | Painel Lovable → API Keys | ai-agent, ask-task-context, extract-contract, process-monitored-inboxes |
| `EXTERNAL_API_KEY` | Definido internamente | external-requests (webhooks) |
| `NFSE_PROVIDER_API_KEY` | Provedor NFS-e contratado (FocusNFE / eNotas / WebmaniaBR) | emit-nfe |
| `NFSE_PROVIDER_API_SECRET` | Provedor NFS-e contratado | emit-nfe |
| `EXTERNAL_SUPABASE_SERVICE_KEY` | Painel do projeto externo `pyexbnnuzjcsiypootcq` → API | sync-external-project |

---

## 3. Google Workspace — Service Account

### 3.1 O que é necessário

Uma **Service Account** no Google Cloud com **Domain-Wide Delegation** habilitada, para que o backend possa agir em nome dos usuários do Workspace (impersonation).

### 3.2 Como obter o Client ID

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. IAM & Admin → **Service Accounts**
3. Clique na service account do projeto
4. Aba **Details** → campo **"Unique ID"** (número com ~21 dígitos)

> Este número é o **Client ID** usado no Google Admin Console para Domain-Wide Delegation.

### 3.3 Configurar Domain-Wide Delegation

1. Acesse [admin.google.com](https://admin.google.com)
2. Segurança → Controles de API → **Delegação em todo o domínio**
3. Adicionar novo cliente com:
   - **Client ID:** *(Unique ID numérico da service account)*
   - **Escopos OAuth:**
     ```
     https://www.googleapis.com/auth/calendar,
     https://www.googleapis.com/auth/calendar.events,
     https://www.googleapis.com/auth/gmail.readonly,
     https://www.googleapis.com/auth/gmail.send,
     https://www.googleapis.com/auth/gmail.modify,
     https://www.googleapis.com/auth/drive,
     https://www.googleapis.com/auth/drive.file,
     https://www.googleapis.com/auth/drive.readonly,
     https://www.googleapis.com/auth/spreadsheets
     ```

### 3.4 Formato do `GOOGLE_SERVICE_ACCOUNT_JSON`

O secret deve conter o JSON completo baixado do Google Cloud:

```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...",
  "client_email": "nome@projeto.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### 3.5 Usuário de impersonation

- O usuário `raquel@marquesi.com.br` deve ser um usuário válido do Google Workspace com **Google Calendar e Gmail ativos**.
- Após configurar a delegação, aguardar ~5 minutos para propagar.

---

## 4. Recursos Google utilizados

| API | Escopos | Usado por |
|-----|---------|-----------|
| Google Calendar | `calendar`, `calendar.events` | google-calendar, cross-check-calendar, sync-email-agendamentos |
| Google Gmail | `gmail.readonly`, `gmail.send`, `gmail.modify` | google-gmail, process-monitored-inboxes |
| Google Drive | `drive`, `drive.file`, `drive.readonly` | google-drive, extract-contract |
| Google Sheets | `spreadsheets` | sync-sheets, sync-clients-sheet, sync-solicitacoes-sheet |

### IDs de recursos conhecidos

| Recurso | ID |
|---------|----|
| Shared Drive (Marquesi) | `0ABiR8Ngj0asyUk9PVA` |
| Planilha Atividades | `1lRLiCtMYnYRm7VJnLpTiUvdBVIWUSOLxFhOyFvOXqOQ` |
| Planilha Agendamentos | `1WhIQS2W2Gkx1_Dh_untrLKuACTOmpqURnjx_aH3ik4I` |

---

## 5. Integrações externas

| Serviço | Endpoint | Autenticação | Finalidade |
|---------|----------|-------------|------------|
| Lovable AI Gateway | `https://ai.gateway.lovable.dev/v1/chat/completions` | Bearer `LOVABLE_API_KEY` | Extração de contratos, classificação de e-mails, agente IA |
| Supabase externo | `https://pyexbnnuzjcsiypootcq.supabase.co` | `EXTERNAL_SUPABASE_SERVICE_KEY` | Sync de agendamentos |
| FocusNFE | `https://api.focusnfe.com.br/v2/nfse` | `NFSE_PROVIDER_API_KEY` | Emissão de NFS-e |
| eNotas | `https://api.enotas.com.br/v2/empresas/nfse` | `NFSE_PROVIDER_API_KEY` | Emissão de NFS-e (alternativo) |
| WebmaniaBR | `https://webmaniabr.com/api/2/nfse/emissao` | `NFSE_PROVIDER_API_KEY` + `NFSE_PROVIDER_API_SECRET` | Emissão de NFS-e (alternativo) |

---

## 6. Checklist de migração

Use esta lista ao reconfigurar o projeto em um novo ambiente:

- [ ] Configurar `.env` com as variáveis VITE do Supabase
- [ ] Configurar `SUPABASE_URL` e `SUPABASE_ANON_KEY` nos secrets das Edge Functions
- [ ] Configurar `SUPABASE_SERVICE_ROLE_KEY` nos secrets das Edge Functions
- [ ] Gerar/importar chave JSON da service account Google e configurar `GOOGLE_SERVICE_ACCOUNT_JSON`
- [ ] Configurar Domain-Wide Delegation no Google Admin Console com todos os escopos
- [ ] Verificar que `raquel@marquesi.com.br` está ativo no Workspace com Calendar e Gmail habilitados
- [ ] Aguardar ~5 min e testar google-calendar e google-gmail
- [ ] Configurar `LOVABLE_API_KEY`
- [ ] Configurar `NFSE_PROVIDER_API_KEY` e `NFSE_PROVIDER_API_SECRET` (se NFS-e estiver em uso)
- [ ] Configurar `EXTERNAL_SUPABASE_SERVICE_KEY` (se sync externo estiver em uso)
- [ ] Configurar `EXTERNAL_API_KEY` (se webhooks externos estiverem em uso)
