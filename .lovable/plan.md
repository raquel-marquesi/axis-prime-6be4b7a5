

## Criar solicitações retroativas e vincular prazos órfãos

### Situação atual

| Métrica | Valor |
|---------|-------|
| Prazos `planilha_cliente` abertos sem `solicitacao_id` | **693** |
| Já vinculados (UPDATE anterior) | **402** |
| Processos distintos afetados | ~601 |

O UPDATE anterior já foi executado e vinculou 402 prazos. Os 693 restantes não possuem solicitação correspondente no banco — precisam de solicitações retroativas.

### Plano

**Passo 1 — Migration SQL: Criar solicitações retroativas + vincular**

Uma única migration que:

1. Insere uma `solicitacao` para cada prazo órfão com dados extraídos do próprio deadline e processo:
   - `origem`: `'planilha_cliente'`
   - `titulo`: `ocorrencia || ' - ' || numero_processo`
   - `process_id`: do deadline
   - `client_id`: `id_cliente` da tabela `processes`
   - `data_limite`: `data_prazo` do deadline
   - `status`: `'pendente'`
   - `prioridade`: `'media'`
2. Atualiza o `solicitacao_id` do deadline para apontar para a solicitação recém-criada

Será feito com um CTE (`WITH ... INSERT ... RETURNING`) para executar atomicamente.

```sql
WITH new_sols AS (
  INSERT INTO solicitacoes (origem, titulo, process_id, client_id, data_limite, status, prioridade)
  SELECT 
    'planilha_5_clientes',
    pd.ocorrencia || ' - ' || p.numero_processo,
    pd.process_id,
    p.id_cliente,
    pd.data_prazo::text,
    'pendente',
    'media'
  FROM process_deadlines pd
  JOIN processes p ON p.id = pd.process_id
  WHERE pd.source = 'planilha_cliente'
    AND pd.is_completed = false
    AND pd.solicitacao_id IS NULL
  RETURNING id, process_id, data_limite
)
UPDATE process_deadlines pd
SET solicitacao_id = ns.id
FROM new_sols ns
WHERE pd.process_id = ns.process_id
  AND pd.data_prazo = ns.data_limite::date
  AND pd.source = 'planilha_cliente'
  AND pd.is_completed = false
  AND pd.solicitacao_id IS NULL;
```

**Passo 2 — Verificar frontend**

Navegar à aba Prazos Processuais e confirmar que a coluna "Origem" exibe o ícone de link com o título da solicitação para os prazos recém-vinculados, em vez de "Manual".

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | INSERT solicitações retroativas + UPDATE deadlines |
| Nenhum arquivo de código | Frontend já renderiza o badge (linha 131 do PrazosProcessuaisTab) |

### Resultado

- **693 solicitações** criadas retroativamente com origem `planilha_5_clientes`
- **693 prazos** vinculados às novas solicitações
- **100%** dos prazos `planilha_cliente` abertos terão `solicitacao_id` preenchido
- Frontend exibirá o badge de solicitação em todos esses prazos

