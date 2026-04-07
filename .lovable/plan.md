

## Corrigir painéis de resumo de prazos (contagens zeradas)

### Diagnóstico

O problema tem duas causas:

1. **Queries independentes com timing diferente.** `useDeadlineCounts` e `useAllProcessDeadlines` são queries separadas no React Query. A contagem depende de `userId` e `profile?.id` — se o `profile` demora a carregar (fetch sequencial no AuthContext), a query de contagem fica com `enabled: false` e retorna zero. Quando o usuário clica num card, o re-render já tem o profile carregado, então os dados aparecem.

2. **`staleTime: 2 * 60 * 1000` na query de contagens.** Mesmo quando finalmente carrega, a contagem fica "congelada" por 2 minutos, não reagindo a mudanças em tempo real.

3. **Sem Realtime.** Apesar do sistema ter `useRealtimeInvalidation` para `process_deadlines`, a query de contagens (`deadline-counts`) pode não estar sendo invalidada por esse mecanismo.

### Solução

#### 1. Derivar contagens dos dados já carregados (eliminar query separada)

Em vez de fazer 4 queries COUNT separadas ao banco, computar as contagens a partir dos dados que `useAllProcessDeadlines` já traz. Isso elimina a dessincronização entre painéis e tabela.

**Mudança em `PrazosProcessuaisTab.tsx`:**
- Fazer uma query "base" sem filtro de status (apenas `excludeCompleted: false`) para obter todos os prazos
- Calcular `counts` via `useMemo` a partir dos dados retornados
- Aplicar o `cardFilter` / `statusFilter` apenas no `filteredDeadlines`, não na query

**Resultado:** cards e tabela sempre mostram dados do mesmo dataset — impossível ficarem dessincronizados.

#### 2. Manter `useDeadlineCounts` como fallback rápido (opcional)

Manter a query de contagens apenas para o Dashboard (onde não se carrega a lista completa), mas com `staleTime` reduzido para 30 segundos.

#### 3. Garantir invalidação Realtime

Verificar se `useRealtimeInvalidation` invalida a queryKey `['all-process-deadlines']`. Se não, adicionar.

### Detalhes técnicos

**`PrazosProcessuaisTab.tsx` — mudança principal:**

```typescript
// Query SEM filtro de status — traz tudo (incluindo concluídos)
const { data: allDeadlines = [], isLoading } = useAllProcessDeadlines({
  dateFrom: dateFrom || undefined,
  dateTo: dateTo || undefined,
  excludeCompleted: false,
});

// Contagens derivadas dos mesmos dados
const counts = useMemo(() => ({
  atrasado: allDeadlines.filter(d => d.status === 'atrasado').length,
  hoje: allDeadlines.filter(d => d.status === 'hoje').length,
  futuro: allDeadlines.filter(d => d.status === 'futuro').length,
  concluido: allDeadlines.filter(d => d.status === 'concluido').length,
}), [allDeadlines]);

// Filtro aplicado localmente
const deadlines = useMemo(() => {
  if (!effectiveStatusFilter) return allDeadlines.filter(d => d.status !== 'concluido');
  return allDeadlines.filter(d => d.status === effectiveStatusFilter);
}, [allDeadlines, effectiveStatusFilter]);
```

**`useAllProcessDeadlines.ts`:**
- Reduzir `staleTime` de 2 min para 30 segundos
- Remover o `limit(5000)` que pode truncar dados e distorcer contagens (usar paginação RPC se necessário)

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/solicitacoes/PrazosProcessuaisTab.tsx` | Derivar counts do dataset local em vez de query separada |
| `src/hooks/useAllProcessDeadlines.ts` | Reduzir staleTime; ajustar limit |

### Resultado

- Cards de resumo e tabela sempre sincronizados (mesma fonte de dados)
- Eliminação de 4 queries COUNT desnecessárias na página de Prazos
- Atualização mais rápida (staleTime 30s em vez de 2min)

