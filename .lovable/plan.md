

## Corrigir Faturamento: `permission denied for view clients_safe`

### Diagnóstico

O formulário de faturamento (`InvoiceFormDialog`) usa o hook `useClientsSafe` que consulta a view `clients_safe`. Essa view **não possui nenhum GRANT** de SELECT para nenhum role (nem `authenticated`, nem `anon`). Toda tentativa de abrir o formulário de faturamento falha silenciosamente com `permission denied for view clients_safe`.

Os logs do Postgres confirmam: dezenas de erros consecutivos com essa mensagem.

### Solução

Uma migration SQL com dois comandos:

1. **GRANT SELECT** na view `clients_safe` para o role `authenticated`
2. **Não conceder** ao role `anon` (a view expõe dados comerciais de clientes)

```sql
GRANT SELECT ON public.clients_safe TO authenticated;
```

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | `GRANT SELECT ON public.clients_safe TO authenticated` |

Nenhum arquivo de código precisa ser alterado — o hook `useClientsSafe` e o `InvoiceFormDialog` já estão corretos, apenas bloqueados pela falta de permissão no banco.

### Resultado

- Formulário de faturamento carrega a lista de clientes corretamente
- `AccountFormDialog` (que também usa `useClientsSafe`) passa a funcionar
- Sem impacto em segurança: a view já exclui campos sensíveis (PII) e só será acessível por usuários autenticados

