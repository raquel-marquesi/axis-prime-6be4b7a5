

## Simulação de Faturamento de Cálculos — Fluxo Completo

### Diagnóstico da Situação Atual

| Item | Estado | Problema |
|------|--------|----------|
| Dados de produção (Março/RAIA DROGASIL) | ✅ 508 lançamentos, 225 processos | Existe base real |
| Lançamentos duplicados | ⚠️ ~10 pares duplicados identificados | Mesmo processo/data/descrição |
| Lançamentos sem tipo de atividade | ❌ 296 de 508 (58%) | Não são classificáveis para faturamento |
| Conta de faturamento | ❌ 0 contas cadastradas | Impossível criar fatura |
| Contato de faturamento | ❌ 0 contatos | Impossível criar fatura |
| Contrato de precificação | ❌ Sem contrato para RAIA DROGASIL | Não existe valor unitário/fixo definido |
| Faturas | ❌ 0 faturas no sistema | Nunca foi emitida nenhuma |
| Relatório de pré-faturamento | ❌ Não existe | Não há tela para consolidar produção por cliente antes de faturar |
| Fluxo de validação/remoção | ❌ Não existe | Não há etapa intermediária de revisão |

### O que Funciona Hoje

1. **Formulário de fatura individual** — funciona se já existir Conta + Contato
2. **Faturamento em lote** — funciona (gera faturas por contato dentro de uma conta)
3. **Emissão de NFS-e** — dialog implementado, depende de config do prestador
4. **Tabela de faturas** — exibe, marca como paga, exclui

### O que Falta (Gaps Críticos)

O sistema **não possui** o fluxo principal de faturamento por produção:

1. **Relatório de Produção por Cliente/Mês** — Tela que consolida todos os cálculos realizados no mês para um cliente, agrupados por tipo de atividade, com totais e valores baseados no contrato de precificação
2. **Pré-Relatório de Validação** — Etapa intermediária onde o gestor revisa a lista, identifica duplicatas e marca itens como "não faturável"
3. **Geração Automática de Fatura** — A partir do pré-relatório aprovado, gerar a fatura com valor calculado automaticamente
4. **Dados cadastrais do RAIA DROGASIL** — Faltam: Conta, Contato de Faturamento e Contrato de Precificação

### Plano de Implementação

#### 1. Migração SQL — Tabela `billing_preview_items`

Criar tabela intermediária para o pré-relatório de faturamento:

```text
billing_previews (id, client_id, reference_month, status [draft/approved/invoiced], total_items, total_value, created_by, created_at)
billing_preview_items (id, preview_id, timesheet_entry_id, process_id, numero_processo, reclamante, tipo_atividade, data_atividade, descricao, quantidade, valor_unitario, valor_total, is_duplicate, is_billable, exclusion_reason)
```

RLS: apenas `authenticated` com scope de coordenador+ pode acessar.

#### 2. Nova página/aba "Pré-Faturamento" no módulo Financeiro

Componente `BillingPreviewTab.tsx`:
- Filtros: Cliente (select), Mês/Ano (date picker)
- Botão "Gerar Pré-Relatório" que:
  - Busca todos os `timesheet_entries` do mês para o cliente
  - Detecta duplicatas automaticamente (mesmo processo + mesma data + mesma descrição)
  - Marca lançamentos sem `activity_type_id` como "não classificado"
  - Aplica valor unitário do `contract_pricing` (se existir)
- Tabela interativa com:
  - Checkbox para marcar/desmarcar como faturável
  - Badge "Duplicata" em vermelho
  - Badge "Sem tipo" em amarelo
  - Coluna de valor calculado
  - Totalizadores no rodapé
- Botão "Aprovar e Gerar Fatura" → cria invoice automaticamente

#### 3. Componente `BillingPreviewTable.tsx`

Tabela detalhada dos itens do pré-relatório com:
- Seleção em massa (select all / deselect duplicatas)
- Filtro rápido por status (duplicata, sem tipo, faturável)
- Exportar para Excel (opcional v1)

#### 4. Hook `useBillingPreview.ts`

- `generatePreview(clientId, month)` — busca timesheet + detecta duplicatas + calcula valores
- `updateItemBillable(itemId, isBillable, reason)` — marca/desmarca
- `approveAndInvoice(previewId)` — cria a fatura a partir do preview aprovado

#### 5. Aba "Faturamento" no Financeiro

Adicionar sub-aba "Pré-Faturamento" junto com as existentes (Faturas, Boletos, NFS-e, Contratos).

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar `billing_previews` + `billing_preview_items` com RLS |
| `src/hooks/useBillingPreview.ts` | Novo — lógica de geração e aprovação |
| `src/components/financeiro/BillingPreviewTab.tsx` | Novo — UI principal do pré-faturamento |
| `src/components/financeiro/BillingPreviewTable.tsx` | Novo — tabela detalhada dos itens |
| `src/pages/Financeiro.tsx` | Adicionar sub-aba "Pré-Faturamento" na aba Faturamento |

### Fluxo Visual

```text
Selecionar Cliente + Mês
        │
        ▼
  [Gerar Pré-Relatório]
        │
        ▼
  ┌─────────────────────────────────┐
  │ Pré-Relatório de Faturamento    │
  │                                 │
  │ ✅ Cálculo Liquidação  (150x)   │
  │ ✅ Embargos Execução   (30x)    │
  │ ⚠️ Sem tipo atividade  (296x)  │
  │ 🔴 Duplicatas          (10x)    │
  │                                 │
  │ Total faturável: 180 cálculos   │
  │ Valor: R$ XX.XXX,XX             │
  └─────────────────────────────────┘
        │
        ▼
  [Revisar → Remover duplicatas]
  [Marcar não-faturáveis]
        │
        ▼
  [Aprovar e Gerar Fatura]
        │
        ▼
  Fatura criada → NFS-e
```

### Resultado

- Fluxo completo: Produção → Pré-relatório → Validação → Fatura → NFS-e
- Detecção automática de duplicatas
- Gestão visual de itens faturáveis/não-faturáveis
- Cálculo automático de valor baseado no contrato de precificação
- Rastreabilidade total (cada item da fatura liga a um timesheet_entry)

