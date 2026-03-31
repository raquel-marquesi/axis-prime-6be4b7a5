## Análise Crítica: Instruções LegalManager vs. Sistema Atual

### Mapeamento dos 12 passos do documento vs. nosso sistema

O documento da Marquesi Consultoria descreve o fluxo de cadastro no LegalManager em 12 etapas. Aqui está o gap analysis completo:

---

### Campos JÁ PRESENTES no sistema


| Passo LM                            | Campo/Conceito                              | Onde está no nosso sistema                                     |
| ----------------------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| 1º Consultar CNPJ na RF             | Validação de CNPJ                           | `validateCNPJ()` em `lib/validators.ts` + checagem duplicidade |
| 2º Aba Dados                        | CNPJ, Razão Social, PF/PJ, Filial           | `DadosTab` + `branch_ids`                                      |
| 2º Grupo de Empresas                | Grupo Econômico                             | `GrupoContratoFields` → `economic_groups`                      |
| 2º Tipo (Cliente/Fornecedor)        | Tipo Cadastro                               | `tipo_cadastro: cliente/fornecedor`                            |
| 4º Endereço (CEP, logradouro, etc.) | Endereço completo                           | `EnderecoTab` — todos os campos                                |
| 5º Salvar antes de contatos         | Fluxo sequencial                            | Já funciona (salva cliente, depois contatos)                   |
| 6º/7º Contrato                      | Objeto, datas, condições                    | `ContratoTab` — campos básicos                                 |
| 11º Indicação/Participação          | Indicação por, tipo, valor, dados bancários | Campos `indicacao_*` no schema                                 |
| 12º E-mail para NF/Boleto           | E-mail NF, aviso vencimento                 | `billing_contacts.email_nf` + `billing_reminder_enabled`       |


### Campos PARCIALMENTE presentes (precisam melhoria)


| Passo LM                                | Campo                                | Situação atual                                        | Gap                                                 |
| --------------------------------------- | ------------------------------------ | ----------------------------------------------------- | --------------------------------------------------- |
| 2º Inscrição Estadual / CCM/IM          | IE e IM                              | **Só no `billing_contacts**`, não no cliente          | Deveria estar no cadastro do cliente PJ             |
| 2º Ramo de Atividade / Área de Atuação  | Classificação do cliente             | Não existe                                            | pode ser ignorado                                   |
| 2º Código Externo                       | Código do cliente no sistema externo | `canal_importacao` é parecido mas não é isso          | pode ser ignorado                                   |
| 3º Aba Cobrança (Gross-up)              | Tipo de Gross-up                     | Não existe                                            | Relevante para faturamento                          |
| 3º Dia para Emissão / Vencimento        | Datas fixas de faturamento           | `billing_reminder_days` é parcial                     | Faltam campos de dia de emissão e dia de vencimento |
| 7º Tabela de Honorários / Moeda         | Tabela + moeda do contrato           | `contract_pricing` tem `moeda` mas sem vínculo direto | Falta link Contrato → Tabela                        |
| 7º Profissional Responsável do Contrato | Responsável pelo contrato            | Não existe no cadastro do cliente                     | pode ser ignorado                                   |
| 7º Modalidade do Contrato               | Tipo/modalidade                      | Não existe                                            | Campo novo                                          |
| 7º Limites/Cap (valor e horas)          | Caps de faturamento                  | Não existe                                            | Campos novos em `contract_pricing` ou tabela nova   |
| 7º Data de Reajuste                     | Reajuste contratual                  | Não existe                                            | Campo novo                                          |


### Campos AUSENTES que precisam ser implementados


| Passo LM                             | Campo                                         | Prioridade | Sugestão de implementação                                                                            |
| ------------------------------------ | --------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| 2º Inscrição Estadual                | `inscricao_estadual`                          | Alta       | Adicionar à tabela `clients` e ao `DadosTab` (PJ)                                                    |
| 2º CCM/Inscrição Municipal           | `inscricao_municipal`                         | Alta       | Idem                                                                                                 |
| 2º Código Externo                    | `codigo_externo`                              | Média      | Adicionar à tabela `clients` — útil para integrações                                                 |
| 2º Ramo de Atividade                 | `ramo_atividade`                              | Média      | Ignorar                                                                                              |
| 3º Dia de Emissão NF                 | `dia_emissao_nf`                              | Alta       | Adicionar à tabela `clients` — essencial para agenda de faturamento                                  |
| 3º Dia de Vencimento                 | `dia_vencimento`                              | Alta       | Idem                                                                                                 |
| 3º Gross-up (sim/não + tipo)         | `aplicar_grossup`, `tipo_grossup`             | Média      | Adicionar à tabela `clients`                                                                         |
| 7º Modalidade do Contrato            | `modalidade`                                  | Média      | Adicionar à tabela `contract_pricing`                                                                |
| 7º Responsável do Contrato           | `responsavel_id`                              | Alta       | ignorar                                                                                              |
| 7º Data de Reajuste                  | `data_reajuste`                               | Média      | Adicionar à tabela `contract_pricing`                                                                |
| 7º Cap valor/horas                   | `cap_valor`, `cap_horas`                      | Média      | Adicionar à tabela `contract_pricing`                                                                |
| 8º Pagadores (entidade separada)     | Pagadores do contrato                         | Alta       | A tabela `billing_contacts` já existe mas não está vinculada ao fluxo de cadastro do cliente         |
| 9º Eventos/Tipos de Cálculo          | Preços por tipo de cálculo                    | Alta       | `contract_pricing` já tem `tipo_calculo` — mas falta vincular ao cadastro de cliente de forma guiada |
| 3º Nome LEDES (cliente e escritório) | `nome_ledes_cliente`, `nome_ledes_escritorio` | Baixa      | Específico do LegalManager                                                                           |


---

### Sugestões de melhoria no fluxo

**1. Expandir `DadosTab` para PJ**
Adicionar campos: Inscrição Estadual, Inscrição Municipal, Ramo de Atividade, Código Externo. Estes já existem no `BillingContactFormDialog` (IE/IM) — reaproveitar a lógica mas colocar no nível do cliente.

**2. Criar aba "Cobrança" no formulário de cliente**
Campos: Dia de Emissão, Dia de Vencimento, Gross-up (sim/não + tipo), Nome LEDES. Atualmente essas informações estão espalhadas entre `ContratoTab` e configurações do financeiro. Centralizar no cadastro do cliente.

**3. Vincular Pagadores ao cadastro do cliente**
A tabela `billing_contacts` já existe e tem todos os campos necessários (razão social, CPF/CNPJ, endereço, e-mail NF, IE, IM). Mas só é acessível pelo módulo financeiro (via `accounts`). Adicionar um atalho/aba no formulário de cliente para gerenciar pagadores diretamente.

**4. Vincular Eventos/Precificação ao cadastro do cliente**
A tabela `contract_pricing` já tem os 21 tipos de cálculo listados no documento. Mas a gestão acontece isolada no módulo financeiro. Adicionar uma aba "Precificação" no formulário do cliente que mostre os contratos e permita incluir novos.

**5. Enriquecer `contract_pricing**`
Adicionar colunas: `modalidade`, `responsavel_id` (FK profiles), `data_reajuste`, `cap_valor`, `cap_horas`, `idioma`, `status_contrato`.

**6. Melhorar conexão com faturamento**
Hoje a `AgendaFaturamentoWidget` existe mas não consome `dia_emissao_nf` / `dia_vencimento` do cliente. Com esses campos, a agenda pode gerar automaticamente lembretes de emissão de NF por cliente, integrando com `billing_reminder_enabled`.

---

### Implementação proposta (por prioridade)

**Fase 1 — Campos no cliente (migration + frontend)**

- Migration: adicionar colunas `inscricao_estadual`, `inscricao_municipal`, `codigo_externo`, `ramo_atividade`, `dia_emissao_nf`, `dia_vencimento`, `aplicar_grossup`, `tipo_grossup` à tabela `clients`
- Frontend: expandir `DadosTab` (PJ) e criar nova aba "Cobrança" no `ClientFormDialog`

**Fase 2 — Enriquecer contratos (migration + frontend)**

- Migration: adicionar colunas `modalidade`, `responsavel_id`, `data_reajuste`, `cap_valor`, `cap_horas`, `status_contrato` à tabela `contract_pricing`
- Frontend: atualizar `ContractPricingFormDialog` com os novos campos

**Fase 3 — Integrar Pagadores e Precificação ao cadastro do cliente**

- Adicionar aba "Pagadores" no `ClientFormDialog` que lista/gerencia `billing_contacts` vinculados
- Adicionar aba "Precificação" que lista/gerencia `contract_pricing` vinculados ao `client_id`
- Reorganizar abas: Dados | Endereço | Contatos | Cobrança | Contrato | Pagadores | Precificação | Outros

**Fase 4 — Agenda de faturamento inteligente**

- Usar `dia_emissao_nf` e `dia_vencimento` para alimentar a `AgendaFaturamentoWidget` automaticamente
- Gerar alertas baseados em `billing_reminder_days` antes do vencimento

### Resumo técnico


| Fase | Tipo                     | Arquivos principais                                                            |
| ---- | ------------------------ | ------------------------------------------------------------------------------ |
| 1    | Migration SQL + Frontend | `clients` table, `DadosTab.tsx`, `ClientFormDialog.tsx`, `clientFormSchema.ts` |
| 2    | Migration SQL + Frontend | `contract_pricing` table, `ContractPricingFormDialog.tsx`                      |
| 3    | Frontend                 | `ClientFormDialog.tsx` (novas abas)                                            |
| 4    | Frontend                 | `AgendaFaturamentoWidget.tsx`                                                  |
