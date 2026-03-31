

## Aplicar fallback SLA nas Edge Functions de sincronização

### Contexto

Registros importados das planilhas (pautas e 5 clientes) que chegam sem prazo explícito ficam com `data_limite = NULL` e não geram `process_deadlines`. As regras de SLA já existem na tabela `client_sla_rules` (ACHE 48h, ASSAÍ 48h, ATACADÃO 72h, CARREFOUR 72h, RAIA DROGASIL 72/120/168h). Esses SLAs devem ser usados como fallback para calcular `data_limite` quando a planilha não traz prazo.

### Alterações

**1. `supabase/functions/sync-pautas-github/index.ts`**

- Após carregar `profiles`, `processes` e `calcTypes` (~linha 396), carregar também:
  - `client_sla_rules` (tabela completa)
  - `clients` (id, nome, razao_social, nome_fantasia) + `client_aliases`
- Construir dois mapas:
  - `clientNameMap`: nome do cliente → client_id
  - `clientSlaMap`: client_id → array de `{ calculation_type, deadline_hours }`
- Após resolver `processId` (~linha 484), se `parsed.dataLimite` for null:
  - Resolver `clientId` via `parsed.processoCliente` usando `clientNameMap`
  - Se não achar, tentar resolver via `processId` → buscar `id_cliente` no processo
  - Buscar regra SLA: primeiro por `parsed.calculoTipo`, depois regra "Geral"
  - Calcular `dataLimite = dataReferencia + deadline_hours` (usar data da decisão se disponível, senão `created_at` = now)
  - Adicionar `sla_derived: true` e `sla_hours: N` no `extracted_details`
- Atualizar a condição da linha 538: `if (processId && dataLimite)` passa a incluir prazos derivados do SLA
- Inserir o `client_id` no registro da solicitação (campo existe mas não é preenchido atualmente)

**2. `supabase/functions/sync-solicitacoes-sheet/index.ts`**

- Após carregar clients/aliases (~linha 171), carregar `client_sla_rules`
- Construir `clientSlaMap`: client_id → array de regras
- Após `const dataLimite = parseDate(prazoRaw)` (~linha 325), se `dataLimite` for null e `clientId` existir:
  - Extrair tipo de cálculo do `tituloClean` (match heurístico: "EXECUÇÃO", "CONTINGÊNCIA", "INICIAL")
  - Buscar regra SLA do cliente (por tipo, fallback "Geral")
  - Calcular prazo: `dataSolicitacao + deadline_hours` ou `now() + deadline_hours`
  - Marcar flag no registro para rastreabilidade

**3. Função auxiliar compartilhada (inline em cada arquivo)**

```text
function applySlaFallback(
  clientId, clientSlaMap, calculoTipo, dataReferencia
) → { dataLimite, slaHours } | null
  1. Buscar rules = clientSlaMap.get(clientId)
  2. Match por calculation_type (normalizado)
  3. Fallback para regra com calculation_type = "Geral" ou null
  4. base = dataReferencia || new Date().toISOString()
  5. return { dataLimite: addHours(base, hours), slaHours: hours }
```

### Impacto esperado

- Pautas da ACHE, ASSAÍ, ATACADÃO, CARREFOUR e RAIA DROGASIL que chegam sem prazo passam a ter `data_limite` calculada
- Novos `process_deadlines` são gerados para esses registros
- Flag `sla_derived: true` nos detalhes permite distinguir prazos reais de calculados na UI
- Nenhuma alteração no banco de dados necessária (campos já existem)

### Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/sync-pautas-github/index.ts` | Carregar SLA + clients, aplicar fallback, preencher client_id |
| `supabase/functions/sync-solicitacoes-sheet/index.ts` | Carregar SLA, aplicar fallback quando prazo vazio |

