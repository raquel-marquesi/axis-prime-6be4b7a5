

## Adicionar aba "Relatórios" na página de Prazos

### O que muda

A página de Prazos (`/solicitacoes`) passará a ter duas abas: **Prazos** (conteúdo atual) e **Relatórios** (reaproveitando o componente `PrazosReport` já existente).

### Arquivo a editar

**`src/pages/Solicitacoes.tsx`**

- Importar `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` do shadcn
- Importar `PrazosReport` de `@/components/relatorios/PrazosReport`
- Importar ícones `Clock` e `BarChart3` do lucide-react
- Envolver o conteúdo atual em uma estrutura de Tabs com duas abas:
  - **Prazos** (default) — renderiza `<PrazosProcessuaisTab />`
  - **Relatórios** — renderiza `<PrazosReport />`

### Resultado

O usuário poderá alternar entre a gestão operacional de prazos e os relatórios analíticos (abertos/atrasados, por profissional, por equipe, por cliente) sem sair da página.

