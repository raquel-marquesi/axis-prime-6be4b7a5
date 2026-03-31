

## Continuar importação do CSV de Timesheet via Edge Function

### Situação atual

- A Edge Function `import-timesheet-csv` já está criada e testada (200 registros em teste anterior: 67 inseridos, 133 duplicatas)
- O CSV tem ~83.870 linhas
- A função aceita batches via `{ rows: [...] }` no body

### Plano de execução

1. **Parsear o CSV** (`user-uploads://TimeSheet_Online_-_Base.csv`) usando `document--parse_document`
2. **Enviar em lotes de 500 linhas** via `supabase--curl_edge_functions` para `import-timesheet-csv`
3. **Iterar** até processar todas as ~83.870 linhas (cerca de 168 chamadas)
4. **Consolidar** as estatísticas de cada batch (inseridos, duplicatas, prazos fechados, erros)
5. **Reportar** o resultado final com totais

### Observações técnicas

- Cada chamada à Edge Function tem timeout de ~50s, mas com 500 linhas por batch deve ser rápido
- A dedup é feita via `external_id` (upsert com `ignoreDuplicates: true`), então re-execuções são seguras
- A baixa automática de prazos acontece em cada batch (deadlines com `is_completed = false` + matching fuzzy)

### Resultado esperado

- ~83k registros processados em `timesheet_entries`
- Estimativa de 200-500 prazos fechados automaticamente
- Relatório consolidado de importação

