

## Visual mais enxuto na tabela de Prazos

### Mudanças em `src/components/solicitacoes/PrazosProcessuaisTab.tsx`

1. **Reduzir altura das linhas**: Adicionar `className="h-8"` nos `TableRow` do body e reduzir padding das `TableCell` com `py-1 text-xs`

2. **Badge "Atrasado" compacta**: Substituir o badge completo `<Badge variant="destructive"><Icon /> Atrasado (XXd)</Badge>` por apenas o texto em vermelho sem badge wrapper:
   - Para `atrasado`: renderizar `<span className="text-destructive font-semibold text-xs">{dias_atraso}d</span>` (sem ícone, sem badge)
   - Para `hoje` e `futuro`: manter badge mas menor, sem ícone — apenas o texto

3. **Reduzir `TableHead` padding**: Adicionar `py-1 text-xs` nos headers

### Resultado

Linhas mais compactas, coluna de status ocupa menos espaço horizontal, visual limpo e denso para quem precisa escanear muitos prazos.

