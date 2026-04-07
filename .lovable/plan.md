

## Baixa de prazos via planilha `1PA97XPvV4mzbVEo9bsSViaxK45jQErnp`

### Contexto

A planilha `1PA97XPvV4mzbVEo9bsSViaxK45jQErnp` tem a mesma estrutura da planilha de produção atual (`data_lancamento`, `numero_processo`, `profissional`, `tipo_atividade`, `descritivo`, etc.). Existem 750 prazos abertos no sistema (345 atrasados, 405 futuros).

### Abordagem

Modificar a Edge Function `sync-baixa-prazos` para ler de **ambas** as planilhas (a atual `14HZn...` e a nova `1PA97...`), unificando os registros antes de fazer o cruzamento com os prazos abertos. A lógica de matching (CNJ + janela ±7 dias) permanece idêntica.

### Implementação

**Arquivo: `supabase/functions/sync-baixa-prazos/index.ts`**

1. Substituir a constante `SPREADSHEET_ID` por um array:
```typescript
const SPREADSHEET_IDS = [
  "14HZnCn1bWUSkIOOQPtnxwv79V08s2veNNAUrn0uMQOo",
  "1PA97XPvV4mzbVEo9bsSViaxK45jQErnp",
];
```

2. No loop principal, iterar sobre ambas as planilhas, acumulando todos os registros em `allRecords`

3. Remover o filtro `cutoffDate` de 90 dias dos prazos abertos — buscar **todos** os prazos abertos independente da data, para não perder baixas de prazos antigos

4. O restante da lógica (matching por CNJ + janela ±7 dias, resolução de profissional, update no banco) permanece inalterada

### Resultado

- A função passa a cruzar prazos abertos com registros de produção de **duas** planilhas
- Prazos que já foram cumpridos conforme a nova planilha serão marcados como concluídos
- O ciclo automático (cron a cada 2h) mantém a sincronia contínua

