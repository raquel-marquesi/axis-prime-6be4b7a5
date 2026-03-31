

## Unificação dos Históricos: timesheet_entries + historico_axis

### Diagnóstico atual

| Métrica | `timesheet_entries` | `historico_axis` |
|---------|--------------------:|----------------:|
| Total registros | 53.113 | 76.151 |
| Com processo vinculado | 5.381 (10%) | 76.130 (99.9%) |
| Com tipo de atividade | 28.884 (54%) | 76.123 (99.9%) |
| Período | Jan/2025 — Mar/2026 | Abr/2025 — Out/2025 |

**Problemas identificados:**

1. **90% dos timesheet_entries estão sem `process_id`** — a importação original falhou no matching de processos
2. **69.791 registros do Axis** referem processos que não existem na tabela `processes` (apenas 2.896 dos 76k têm match)
3. **~8.300 registros** com `tipo_atividade` sem correspondência (principalmente "Cálculo de Provisão de Acordão")
4. **20 profissionais** do Axis não têm perfil no sistema (7.300+ registros perdidos, ex: Paulo Henrique, Ana Caroline, Nathalia)
5. **Campos valiosos do Axis** não preservados: `status_lancamento` (faturado/não faturado), `cliente`, `contrato`, `codigo_externo`, `observacao`, `fechamento`

### Estratégia recomendada

#### Fase 1: Enriquecer o schema de `timesheet_entries`

Adicionar colunas para preservar informações que existem no Axis mas não no schema atual:

```text
timesheet_entries (novas colunas):
  + client_id          UUID  → FK clients (vínculo direto, sem depender de process_id)
  + status_faturamento TEXT  → 'importado' | 'nao_importado' | null
  + observacao         TEXT  → campo livre do Axis
  + source             TEXT  → 'manual' | 'axis_import' | 'planilha' (rastreabilidade)
  + external_id        TEXT  → ID original do Axis para dedup
```

Isso permite que registros sem `process_id` ainda sejam úteis (vinculados ao cliente) e que o status de faturamento alimente o módulo financeiro.

#### Fase 2: Corrigir os mapeamentos antes de re-importar

**2a. Criar processos faltantes** — Os 69.791 registros do Axis referem processos reais que simplesmente não foram cadastrados. Uma Edge Function deve:
- Extrair `numero_processo` únicos do Axis sem match em `processes`
- Criar registros básicos em `processes` com os dados disponíveis (número, reclamante via `parte_contraria`, cliente via matching)
- Estima-se ~5.000 processos novos

**2b. Expandir `user_aliases`** — Cadastrar os 20 profissionais não mapeados como aliases (ex-funcionários ou nomes antigos). A tabela `user_aliases` já existe e tem o campo `is_old_user`. Para profissionais que realmente saíram, criar perfis inativos (`is_active = false`).

**2c. Expandir mapeamento de atividades** — Adicionar na tabela `activity_types` ou via aliases:
- "Cálculo de Provisão de Acordão" → mapear para tipo existente (8.143 registros)
- "Cálculo Segunda Hipótese" → já existe alias parcial (376 registros)

#### Fase 3: Re-importação completa

Uma nova Edge Function `unify-historico` que:

1. Carrega todos os mapas (profiles + user_aliases, processes, clients + client_aliases, activity_types)
2. Para cada registro do `historico_axis`:
   - Resolve `profissional` → `user_id` (via profiles + aliases)
   - Resolve `numero_processo` → `process_id` (incluindo processos recém-criados)
   - Resolve `cliente` → `client_id` (via clients + client_aliases)
   - Resolve `tipo_atividade` → `activity_type_id` (com normalização de acentos e aliases)
   - Preserva `status_lancamento`, `observacao`, `codigo_externo`
3. Usa upsert com `external_id` para evitar duplicatas
4. Opera em batches com controle de offset para processar os 76k registros

#### Fase 4: Frontend unificado

O `ProcessTimesheetTab` (já criado) automaticamente mostrará os dados corrigidos — não precisa de mudança. Mas ganhamos:
- **Mais processos com histórico** (de 5.381 para potencialmente 70k+ registros vinculados)
- **Filtro por status de faturamento** na aba de atividades
- **Relatório de produção** mais completo (widget Produção no Dashboard)

### Ordem de execução

| Etapa | Tipo | Descrição |
|-------|------|-----------|
| 1 | Migration SQL | Adicionar colunas `client_id`, `status_faturamento`, `observacao`, `source`, `external_id` em `timesheet_entries` |
| 2 | Migration SQL | Criar processos faltantes a partir do `historico_axis` (via SQL ou Edge Function) |
| 3 | Insert SQL | Cadastrar user_aliases e atividades faltantes |
| 4 | Edge Function | `unify-historico/index.ts` — re-importação completa com todos os mapeamentos |
| 5 | Frontend | Atualizar `ProcessTimesheetTab` para exibir `status_faturamento` e `client_id` |

### Benefícios

- **Banco único e normalizado** — `historico_axis` pode ser descartada após validação
- **Rastreabilidade** — campo `source` distingue origem de cada registro
- **Dedup segura** — campo `external_id` impede reimportação duplicada
- **Conexão com faturamento** — `status_faturamento` alimenta relatórios financeiros
- **Inclusão futura** — qualquer novo histórico pode ser inserido via Supabase (UI ou API) com o mesmo schema

