

## Redistribuir 109 prazos sem atribuição

### Contexto

A função `assign_calculation` já foi atualizada com balanceamento por carga. Agora é necessário executar essa função para os ~109 prazos/solicitações que estão sem `assigned_to`.

### Execução

**Migration SQL**: Chamar `assign_calculation` para cada solicitação sem atribuição que tenha status pendente/em andamento:

```sql
DO $$
DECLARE
  r RECORD;
  v_count INT := 0;
BEGIN
  FOR r IN
    SELECT id FROM solicitacoes
    WHERE assigned_to IS NULL
      AND status IN ('pendente', 'em_andamento')
  LOOP
    PERFORM assign_calculation(r.id);
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Rebalanceados: % prazos', v_count;
END $$;
```

**Verificação pós-execução**: Query para confirmar a nova distribuição por usuário.

### Resultado

- ~109 prazos redistribuídos de forma equilibrada entre profissionais ativos
- A nova lógica prioriza experiência mas escolhe quem tem menor carga pendente

