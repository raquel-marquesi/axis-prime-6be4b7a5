

## Corrigir balanceamento de atribuição de prazos

### Problema

A função `assign_calculation` prioriza histórico (quem mais trabalhou com o cliente/tipo), criando um ciclo de acumulação. O balanceamento por carga (critério 4) quase nunca é acionado. Resultado: diferenças de até 50x na mesma área.

### Solução proposta

Modificar a função SQL `assign_calculation` para incorporar balanceamento em todos os critérios, não apenas no fallback.

**Mudanças na lógica:**

1. **Critério 1 (mesmo cliente)**: Manter a preferência por profissionais com histórico no cliente, mas entre os candidatos, escolher o que tem **menor carga atual** (não o que tem mais histórico)
2. **Critério 2 (mesmo tipo de cálculo)**: Idem — filtrar por experiência, ordenar por menor carga
3. **Critério 3 (coordenador)**: Sem alteração (é uma atribuição de responsabilidade, não de carga)
4. **Critério 4 (fallback)**: Sem alteração (já faz balanceamento)

**SQL revisado (critérios 1 e 2):**

```sql
-- Critério 1: profissional com histórico no cliente, menor carga atual
SELECT s.assigned_to INTO v_assigned
  FROM solicitacoes s
  JOIN profiles p ON p.user_id = s.assigned_to AND p.is_active = true
 WHERE s.client_id = v_client_id
   AND s.assigned_to IS NOT NULL
   AND s.id != p_solicitacao_id
 GROUP BY s.assigned_to
 HAVING COUNT(*) >= 2  -- tem experiência mínima com o cliente
 ORDER BY (
   SELECT COUNT(*) FROM solicitacoes sub
    WHERE sub.assigned_to = s.assigned_to
      AND sub.status IN ('pendente', 'em_andamento')
 ) ASC
 LIMIT 1;
```

A mesma lógica se aplica ao critério 2.

### Arquivo

| Arquivo | Ação |
|---------|------|
| Migration SQL | `CREATE OR REPLACE FUNCTION assign_calculation` com a lógica corrigida |

### Ação adicional: redistribuir carga atual

Opcionalmente, executar um script de rebalanceamento dos 109 prazos sem atribuição, usando a nova lógica.

### Resultado esperado

- Novos prazos serão distribuídos de forma equilibrada entre profissionais com experiência
- A concentração de carga em poucos profissionais será reduzida progressivamente

