

## Adicionar filtros ao relatório de Prazos

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/relatorios/PrazosReportFilters.tsx` | **Criar** — componente de filtros |
| `src/components/relatorios/PrazosReport.tsx` | **Editar** — integrar filtros, filtrar dados no frontend |

### 1. Criar `PrazosReportFilters.tsx`

Barra horizontal de filtros com:
- **Data início / Data fim** — DatePickers com Popover + Calendar + pointer-events-auto
- **Profissional** — Popover multi-select com checkboxes e busca
- **Cliente** — Popover multi-select com checkboxes e busca  
- **Área** — Popover multi-select com checkboxes e busca
- **Status** — Popover multi-select (Atrasado, Hoje, Futuro)
- **Botão Limpar** — reseta todos os filtros

Cada multi-select exibe badge com contagem de selecionados. Componente exporta interface `PrazosFilters` e constante `EMPTY_FILTERS`.

### 2. Editar `PrazosReport.tsx`

- Adicionar `useState<PrazosFilters>` no componente principal
- Carregar dados do hook `usePrazosAbertosReport` no nível do `PrazosReport` (não dentro de cada tab)
- Extrair listas únicas de profissionais, clientes e áreas dos dados brutos
- Aplicar `.filter()` com a lógica:
  - `dateFrom` / `dateTo` comparam com `data_prazo`
  - Arrays verificam inclusão (OR dentro do grupo)
  - Filtros vazios = sem restrição
- Passar dados filtrados para cada sub-tab como props
- Tabs "Por Profissional", "Por Equipe", "Por Cliente" recalculam agrupamentos a partir dos dados filtrados
- Export CSV exporta dados filtrados
- Contadores no cabeçalho refletem dados filtrados
- Filtros persistem ao trocar entre abas

### Lógica de filtragem

```typescript
const filtered = data.filter(d => {
  if (dateFrom && d.data_prazo < format(dateFrom, 'yyyy-MM-dd')) return false;
  if (dateTo && d.data_prazo > format(dateTo, 'yyyy-MM-dd')) return false;
  if (profissionais.length && !profissionais.includes(d.responsavel)) return false;
  if (clientes.length && !clientes.includes(d.cliente)) return false;
  if (areas.length && !areas.includes(d.area)) return false;
  if (status.length && !status.includes(d.status_prazo)) return false;
  return true;
});
```

### Resultado

- Filtros acima das abas, persistentes entre troca de aba
- Seleção individual e múltipla em todos os critérios
- Dados filtrados refletidos em tabela, contadores e CSV

