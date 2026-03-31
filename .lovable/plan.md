

## Simulação de Faturamento — Widget no Dashboard Financeiro

### Alteração vs plano anterior
O componente **não** se chamará `SimulacaoFaturamentoWidget`. Será nomeado `ProjecaoReceitaWidget` ("Projeção de Receita"), que descreve a funcionalidade sem sugerir ser uma simulação temporária.

### Implementação

**1. Criar `src/components/financeiro/ProjecaoReceitaWidget.tsx`**
- Card com título "Projeção de Receita — Prazos em Aberto"
- Query via Supabase: `process_deadlines` (não completados) → join `processes` → join `clients` → left join `contract_pricing`
- Para cada cliente: `prazos_abertos × preço_médio_contrato` (ou R$ 475,62 como fallback global)
- Cards resumo no topo: Total Geral, Total Com Contrato, Total Estimado, Nº Prazos
- Tabela: Cliente, Prazos Abertos, Preço Médio, Receita Projetada, Fonte (badge "contrato" ou "estimado")
- Ordenação por receita projetada decrescente

**2. Editar `src/components/dashboard/FinanceDashboard.tsx`**
- Importar e renderizar `ProjecaoReceitaWidget` abaixo do `AgendaFaturamentoWidget`

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/financeiro/ProjecaoReceitaWidget.tsx` | Criar |
| `src/components/dashboard/FinanceDashboard.tsx` | Adicionar widget |

