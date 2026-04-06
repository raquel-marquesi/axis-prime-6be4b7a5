

## Plano: Corrigir Edge Function + Backfill + Cron

### Parte 1 — Corrigir `sync-email-agendamentos`

**Arquivo:** `supabase/functions/sync-email-agendamentos/index.ts`

Correções na inserção de `solicitacoes` (linhas 309-326):
- Adicionar `ai_confidence` parseado da coluna CONFIANÇA IA
- Adicionar `extracted_details` JSONB com: `remetente_nome`, `fase_processual`, `gcpj`, `reclamante`, `empresa_re`, `grupo_cliente`, `prazo_preventivo`, `prazo_fatal`, `lido_em`
- Usar coluna GRUPO/CLIENTE para resolver `client_id` antes do fallback pelo nome da aba

Correções na criação de `process_deadlines` (linhas 393-402):
- Trocar `source: "planilha_cliente"` por `source: "sheet_agendamentos"`
- Adicionar `solicitacao_id: sol.id`
- Usar FASE PROCESSUAL como `ocorrencia` (via `extracted_details`), fallback para título
- Usar `upsert` com `onConflict` (mesmo padrão de `sync-solicitacoes-sheet`)

Correção na query de solicitações para deadlines (linha 375):
- Incluir `extracted_details` no select para acessar `fase_processual`

### Parte 2 — Backfill dos 148 prazos existentes com source errado

**Migração SQL** para corrigir os prazos já criados:
- Atualizar `source` de `"planilha_cliente"` para `"sheet_agendamentos"` nos deadlines que vieram de solicitações com `origem = 'email_sheet'`
- Vincular `solicitacao_id` nos deadlines órfãos (match por `process_id` + `data_prazo` + `ocorrencia`)

```sql
-- Fix source
UPDATE process_deadlines pd
SET source = 'sheet_agendamentos'
FROM solicitacoes s
WHERE s.origem = 'email_sheet'
  AND s.process_id = pd.process_id
  AND s.data_limite = pd.data_prazo
  AND pd.source = 'planilha_cliente'
  AND pd.solicitacao_id IS NULL;

-- Link solicitacao_id
UPDATE process_deadlines pd
SET solicitacao_id = s.id
FROM solicitacoes s
WHERE s.origem = 'email_sheet'
  AND s.process_id = pd.process_id
  AND s.data_limite = pd.data_prazo
  AND pd.solicitacao_id IS NULL;
```

### Parte 3 — Re-executar sync para trazer dados desde 20/03

Após deploy da função corrigida, invocar a função via `curl_edge_functions`. A função já processa todas as abas e faz dedup por `email_id`, então re-executar é seguro — apenas registros novos (sem `email_id` existente) serão inseridos.

### Parte 4 — Configurar Cron

**Migração SQL** para habilitar extensões e agendar:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'sync-email-agendamentos-hourly',
  '0 */2 * * *',  -- a cada 2 horas
  $$
  SELECT net.http_post(
    url := 'https://pojnrtgqigouahmdanze.supabase.co/functions/v1/sync-email-agendamentos',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvam5ydGdxaWdvdWFobWRhbnplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTYwNzgsImV4cCI6MjA5MDEzMjA3OH0.vVMmb87rE-d8Hv0YEXtAEk8I9PoguRmpi7bdYvnqbL0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

Intervalo de 2 horas — equilibra atualidade dos dados vs. custo de API Google Sheets.

### Resultado

- Todos os campos da planilha mapeados corretamente
- Deadlines com `source = "sheet_agendamentos"` e `solicitacao_id` vinculado
- `ocorrencia` usando fase processual real
- 148 deadlines existentes corrigidos (backfill)
- Novos dados desde 20/03 importados automaticamente
- Cron rodando a cada 2 horas

