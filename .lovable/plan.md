

## Importar CSV de Timesheet e dar baixa em prazos abertos

### Diagnóstico

| Métrica | Valor |
|---------|-------|
| Linhas no CSV | ~83.870 (Nov/2025 — Mar/2026) |
| Prazos abertos no sistema (até 31/03) | 1.322 |
| Prazos abertos com timesheet já vinculado | 77 (5,8%) |
| Timesheet entries existentes (mesmo período) | 37.656 |
| Timesheet entries com `process_id` | 5.042 (13%) |

**Problema central**: O CSV contém a produção real realizada, mas o sistema não sabe que esses cálculos foram feitos — os prazos permanecem "em aberto". Além disso, 87% dos timesheet entries existentes não têm `process_id`, impedindo o cruzamento.

### Colunas do CSV vs. tabelas existentes

```text
CSV:                          historico_axis:          timesheet_entries:
data_lancamento               lancamento               data_atividade
Peso                          peso                     quantidade
numero_processo                numero_processo          process_id (UUID)
profissional                  profissional             user_id (UUID)
cliente                       cliente                  client_id (UUID)
tipo_atividade                tipo_atividade           activity_type_id (UUID)
descritivo                    descritivo               descricao
observacao                    observacao               observacao
codigo_externo                codigo_externo           (não existe)
parte_principal               parte_principal          (não existe)
parte_contraria               parte_contraria          reclamante_nome
equipe                        equipe                   (não existe)
filial                        filial                   (não existe)
fechamento                    fechamento               (não existe)
```

O CSV é essencialmente o mesmo formato do `historico_axis`, mas **atualizado** (cobre até março/2026). Pode ser processado pela mesma lógica da Edge Function `unify-historico`.

### Plano de execução

#### Etapa 1: Criar Edge Function `import-timesheet-csv`

Nova Edge Function que:
1. Recebe o CSV (ou referência a ele no Storage) em batches
2. Reutiliza os mapas de resolução do `unify-historico` (profiles, user_aliases, processes, clients, activity_types)
3. Gera `external_id` com hash de `data+processo+profissional+descritivo` para dedup
4. Faz upsert em `timesheet_entries` com `source = 'csv_import'`
5. **Cruzamento de baixa**: Para cada registro importado, verifica se existe um `process_deadline` em aberto no mesmo `process_id` com `tipo_atividade` compatível com `ocorrencia`, e marca como concluído (`is_completed = true`, `completed_at = data_lancamento`)

#### Etapa 2: Lógica de matching deadline ↔ atividade

O cruzamento será feito por:
- `process_deadlines.process_id` = processo resolvido do CSV
- `process_deadlines.is_completed = false`
- `process_deadlines.data_prazo` dentro de uma janela razoável da `data_lancamento` (±30 dias)
- Correspondência fuzzy entre `ocorrencia` do deadline e `tipo_atividade` do CSV

Mapeamento de tipos (exemplos do CSV → ocorrência de deadline):
- "Cálculo Preliminar Inicial" → deadlines com "inicial", "cálculo geral"
- "Cálculo de impugnação (manifestação)" → "impugnação", "manifestação", "contestação"
- "Cálculo de Provisão Sentença" → "sentença", "provisão"
- "Cálculo de Liquidação Execução/Impugnação" → "liquidação", "execução"

#### Etapa 3: Relatório de reconciliação

Após a importação, a função retorna:
- Quantos registros importados / atualizados
- Quantos prazos foram dados baixa automaticamente
- Quantos prazos permanecem abertos (sem atividade correspondente no CSV)
- Lista de divergências (prazo agendado para tipo X, atividade realizada era tipo Y)

### Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/import-timesheet-csv/index.ts` | Criar — importação do CSV com matching e baixa de prazos |
| `supabase/migrations/xxxx.sql` | Adicionar coluna `codigo_externo` em `timesheet_entries` (campo do CSV não preservado) |

### Resultado esperado

- ~83k registros de produção importados para `timesheet_entries` (com dedup)
- Estimativa de **200-500 prazos** dados baixa automaticamente (dos 1.322 abertos)
- Prazos restantes sinalizados como "sem atividade correspondente" para revisão manual
- Histórico de atividades visível nas pastas de processos via aba "Atividades"

