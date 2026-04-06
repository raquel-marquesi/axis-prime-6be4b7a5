

## Melhorar pesquisa e UX do relatório de Prazos

### O que será feito

4 melhorias no relatório de Prazos para facilitar a pesquisa:

### 1. Busca por texto livre

Adicionar um campo `Input` com ícone de lupa acima da tabela. Filtra instantaneamente por qualquer coluna: processo, reclamante, reclamadas, cliente, ocorrência, nº pasta. Lógica: `toLowerCase().includes(searchTerm)` aplicada sobre os dados já filtrados.

### 2. KPIs resumidos no topo

Antes dos filtros, exibir 4 cards compactos lado a lado:
- **Total** (todos os prazos filtrados)
- **Atrasados** (badge destrutivo)
- **Hoje** (badge padrão)
- **Futuro** (badge secundário)

Cada card mostra o número e a porcentagem. Clicáveis para aplicar o filtro de status correspondente.

### 3. Filtros rápidos predefinidos

Linha de botões "chip" entre os KPIs e os filtros detalhados:
- **Atrasados** — filtra status = Atrasado
- **Hoje** — filtra status = Hoje
- **Próximos 7 dias** — filtra dateTo = hoje + 7 dias
- **Este mês** — filtra dateFrom = 1º do mês atual, dateTo = último dia do mês

Cada chip é toggle: clica para ativar, clica de novo para desativar.

### 4. Seletor de mês/ano nos date pickers

Substituir a navegação mês a mês do Calendar por dropdowns de mês e ano no topo do calendário, usando as props `captionLayout="dropdown-buttons"` e `fromYear={2020}` `toYear={2030}` do `react-day-picker`, permitindo pular diretamente para qualquer mês/ano.

### Arquivos a editar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/relatorios/PrazosReport.tsx` | Adicionar KPIs, busca por texto, filtros rápidos |
| `src/components/relatorios/PrazosReportFilters.tsx` | Adicionar `captionLayout="dropdown-buttons"` + `fromYear`/`toYear` nos Calendars; adicionar prop `searchTerm`/`onSearchChange` |

### Lógica de busca

```typescript
const searched = filtered.filter(d => {
  if (!searchTerm) return true;
  const term = searchTerm.toLowerCase();
  return [d.processo, d.reclamante, d.reclamadas, d.cliente, d.ocorrencia, d.numero_pasta, d.responsavel]
    .some(field => field.toLowerCase().includes(term));
});
```

### Layout final

```text
┌─────────────────────────────────────────────┐
│  [Total: 1144] [Atrasados: 890] [Hoje: 12] [Futuro: 242]  ← KPI cards
├─────────────────────────────────────────────┤
│  [Atrasados] [Hoje] [Próx 7 dias] [Este mês]              ← Filtros rápidos
├─────────────────────────────────────────────┤
│  🔍 Buscar processo, reclamante, cliente...                ← Busca texto
│  [Data início ▼] [Data fim ▼] [Profissional ▼] ...        ← Filtros detalhados
├─────────────────────────────────────────────┤
│  [Abertos] [Por Profissional] [Por Equipe] [Por Cliente]   ← Abas
│  ┌─ Tabela ─────────────────────────────┐                  
│  │ ...                                   │                  
│  └───────────────────────────────────────┘                  
└─────────────────────────────────────────────┘
```

