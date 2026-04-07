

## Corrigir duplicação massiva de processos e prazos

### Diagnóstico

| Problema | Impacto | Causa Raiz |
|----------|---------|------------|
| 107 CNJs com processos duplicados | 750 registros, 643 são lixo | `processMap` carregado com limite de 1.000 rows; CNJs ausentes são recriados a cada ciclo |
| Prazos duplicados vinculados | ~643 deadlines órfãos | Cada processo duplicado gera novo deadline (dedup usa `process_id` diferente) |
| Pastas sequenciais criadas | `numero_pasta` inflado (20 → 687 para o mesmo CNJ) | Auto-increment sem verificação prévia |

### Plano de Correção

#### 1. Migração SQL — Limpeza dos dados duplicados

Script que:
- Para cada `numero_processo` com duplicatas, mantém o registro mais antigo (menor `created_at`)
- Move todos os `process_deadlines` dos duplicados para o processo original
- Move todos os `solicitacoes` dos duplicados para o processo original
- Exclui os processos duplicados

#### 2. `sync-email-agendamentos/index.ts` — Corrigir carregamento do processMap

- Substituir `supabase.from("processes").select("id, numero_processo")` (limitado a 1.000) por paginação completa ou query RPC
- Adicionar verificação no `autoCreateProcess`: antes de inserir, fazer SELECT direto por `numero_processo` para confirmar que não existe

```text
Antes:  processMap = Map(1000 entries)  →  CNJ não encontrado  →  INSERT
Depois: processMap = Map(ALL entries)   →  CNJ não encontrado  →  SELECT direto  →  só INSERT se realmente não existe
```

#### 3. `sync-deadlines/index.ts` — Corrigir busca de processo

- Substituir `.limit(1).single()` por `.limit(1).maybeSingle()` para não falhar com múltiplos
- Adicionar ORDER BY `created_at ASC` para sempre pegar o mais antigo (canônico)

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Dedup de processes, reparent deadlines/solicitacoes, delete duplicatas |
| `supabase/functions/sync-email-agendamentos/index.ts` | Paginar processMap; guard no autoCreateProcess |
| `supabase/functions/sync-deadlines/index.ts` | Usar `.maybeSingle()` + ORDER BY |

### Resultado

- 643 processos duplicados eliminados
- Prazos e solicitações consolidados nos processos canônicos
- Prevenção permanente contra recriação

