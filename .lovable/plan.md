## Unificar contratos por cliente em cards com expansão

### Situação atual

A `ContractPricingTable` exibe uma tabela plana onde cada linha é um contrato individual, repetindo o nome do cliente várias vezes. Isso dificulta a visualização quando um cliente tem múltiplos contratos.

### O que será feito

Substituir a tabela plana por um grid de cards agrupados por cliente. Cada card mostra apenas o nome do cliente e um resumo (quantidade de contratos, total de valor). Ao clicar ou passar o mouse, expande/revela os detalhes dos contratos daquele cliente.

### Arquivo a editar

`**src/components/financeiro/ContractPricingTable.tsx**` — reescrever o componente

### Lógica

1. Agrupar os `contracts` por `cliente_nome` (normalizado uppercase) em um `Map<string, ContractPricing[]>`
2. Renderizar um grid responsivo de cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
3. Cada card exibe:
  - Nome do cliente (título)
    &nbsp;
4. Ao clicar no card, abre um `Collapsible` ou `Dialog` com a tabela detalhada dos contratos daquele cliente (contrato, tipo cálculo, valor, percentual, modalidade, processos em andamento/encerrados, status)
5. Usar `Collapsible` do shadcn para expandir inline — mais fluido que um dialog para essa interação

### Estrutura visual

```text
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  CLIENTE A       │  │  CLIENTE B       │  │  CLIENTE C       │
│  3 contratos     │  │  1 contrato      │  │  5 contratos     │
│  R$ 12.500,00    │  │  R$ 800,00       │  │  R$ 45.000,00    │
│  ▼ Ver detalhes  │  │  ▼ Ver detalhes  │  │  ▼ Ver detalhes  │
└─────────────────┘  └─────────────────┘  └─────────────────┘

Ao expandir CLIENTE A:
┌─────────────────────────────────────────────────────┐
│  CLIENTE A                                3 contratos│
│  ┌─────────────────────────────────────────────────┐│
│  │ Contrato   │ Tipo    │ Valor     │ %   │ Status ││
│  │ CT-001     │ Fixo    │ R$ 5.000  │ —   │ Ativo  ││
│  │ CT-002     │ %       │ —         │ 15% │ Ativo  ││
│  │ CT-003     │ Misto   │ R$ 7.500  │ 5%  │ Inativo││
│  └─────────────────────────────────────────────────┘│
│  ▲ Recolher                                         │
└─────────────────────────────────────────────────────┘
```

### Detalhes técnicos

- Importar `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` do shadcn
- Usar `ChevronDown`/`ChevronUp` do lucide-react para indicar estado
- Estado local `openClients: Set<string>` para controlar quais cards estão expandidos
- A prop `compact` continua funcionando (para uso dentro do formulário de clientes)
- Manter a formatação `fmt` existente para valores monetários