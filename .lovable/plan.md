

## Revisitar campos de extração de relatórios

### Diagnóstico atual

**Relatórios existentes na página Relatórios:**
1. **DRE** — exporta: Conta, Valor ✓
2. **Fat. por Cliente** — SEM exportação ✗
3. **Fat. por Profissional** — SEM exportação ✗
4. **Centro de Custos** — exportação própria (CSV inline) ✓
5. **Carteira** — exporta: Cliente, Tipo, Processos, Status, Início/Vencimento Contrato ✓

**Relatórios no Financeiro (não na página Relatórios):**
- Contas a Pagar — exporta: Descrição, Fornecedor, Valor, Vencimento, Status
- Contas a Receber — exporta: NF, Descrição, Valor, Vencimento, Status
- Fluxo de Caixa — exporta: Mês, Entradas, Saídas, Saldo Acumulado
- Tesouraria — SEM exportação ✗

**Relatórios que NÃO existem (solicitados):**
- Prazos abertos/atrasados
- Prazos por profissional
- Prazos por equipe
- Prazos por cliente

### Plano de execução

#### 1. Adicionar exportação CSV aos relatórios sem exportação

| Relatório | Colunas de exportação |
|-----------|----------------------|
| Fat. por Cliente | Conta, Total, Emitidas, Pagas, Em Atraso, Qtd Notas |
| Fat. por Profissional | Profissional, Total Faturado, Qtd Notas, Média/Nota |
| Tesouraria | Conta, Banco, Entradas, Saídas, Saldo |

**Arquivos**: `FaturamentoClienteReport.tsx`, `FaturamentoProfissionalReport.tsx`, `TesourariaReport.tsx` — adicionar `ReportExportButton`

#### 2. Enriquecer colunas de exportação dos relatórios existentes

| Relatório | Campos faltantes a adicionar |
|-----------|------------------------------|
| Contas a Pagar | Categoria, Centro de Custo, Data Pagamento, Nº Documento |
| Contas a Receber | Tomador (razao_social), Conta, Centro de Custo, Data Emissão |
| DRE | Sem alteração necessária |
| Carteira | Centro de Custo, Nº Processos ativos vs inativos |

**Arquivos**: `ContasPagarReport.tsx`, `ContasReceberReport.tsx`, `CarteiraReport.tsx`

#### 3. Criar novos relatórios de Prazos

Criar componente `src/components/relatorios/PrazosReport.tsx` com 4 visões em sub-tabs:

**a) Prazos Abertos/Atrasados**
- Colunas: Processo, Cliente, Ocorrência, Data Prazo, Responsável, Status (atrasado/futuro/hoje), Dias de Atraso
- Dados: `process_deadlines` JOIN `processes` JOIN `clients` JOIN `profiles`
- Exportação CSV com todas as colunas

**b) Prazos por Profissional**
- Colunas: Profissional, Total Prazos, Concluídos, Abertos, Atrasados, Taxa Conclusão
- Agrupado por `assigned_to` → `profiles.full_name`

**c) Prazos por Equipe**
- Colunas: Equipe (reports_to), Total Prazos, Concluídos, Abertos, Atrasados
- Agrupado pelo coordenador/líder via `profiles.reports_to`

**d) Prazos por Cliente**
- Colunas: Cliente, Total Prazos, Concluídos, Abertos, Atrasados
- Agrupado por `processes.id_cliente` → `clients.razao_social`

Criar hook `src/hooks/usePrazosReport.ts` para as queries.

#### 4. Adicionar aba "Prazos" na página Relatórios

**Arquivo**: `src/pages/Relatorios.tsx` — nova tab com ícone `Clock`

#### 5. Padronizar exportação

**Arquivo**: `ReportExportButton.tsx` — sem alteração na lógica (já está padronizado), apenas garantir uso consistente em todos os relatórios.

### Arquivos a criar

| Arquivo | Conteúdo |
|---------|----------|
| `src/components/relatorios/PrazosReport.tsx` | Componente com 4 sub-tabs de relatórios de prazos |
| `src/hooks/usePrazosReport.ts` | Hook com queries para os 4 relatórios de prazos |

### Arquivos a editar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/financeiro/FaturamentoClienteReport.tsx` | Adicionar ReportExportButton |
| `src/components/financeiro/FaturamentoProfissionalReport.tsx` | Adicionar ReportExportButton |
| `src/components/financeiro/TesourariaReport.tsx` | Adicionar ReportExportButton |
| `src/components/financeiro/ContasPagarReport.tsx` | Enriquecer colunas de exportação |
| `src/components/financeiro/ContasReceberReport.tsx` | Enriquecer colunas de exportação |
| `src/components/relatorios/CarteiraReport.tsx` | Adicionar centro_custo à exportação |
| `src/pages/Relatorios.tsx` | Adicionar tab "Prazos" |

### Resultado

- Todos os relatórios terão botão de exportação CSV padronizado
- Exportações incluirão todos os campos relevantes disponíveis no banco
- 4 novos relatórios de prazos (abertos/atrasados, por profissional, por equipe, por cliente)
- Página Relatórios passará de 5 para 6 abas

