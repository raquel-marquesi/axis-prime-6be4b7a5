

## Vincular usuários às equipes na página Equipes

### Problema identificado

1. **Nomes dos líderes aparecem como "Desconhecido"**: O `team_lead_id` na tabela `team_clients` armazena o `profiles.id`, mas o hook `useProfiles` busca por `user_id`. O `getName()` nunca encontra correspondência.

2. **Membros da equipe não são exibidos**: A página só mostra clientes vinculados. Os usuários subordinados (via `profiles.reports_to`) não aparecem, apesar de existirem no banco (ex: Juliana tem 12 membros, Kleber tem 8, Felipe tem 6, Vinícius tem 8, Rafael tem 5).

### Dados no banco

| Líder (profiles.id) | Nome | Membros (reports_to) | Clientes (team_clients) |
|---|---|---|---|
| 5aed80f0... | JULIANA FERREIRA MARTINS PEREIRA | 12 | vários |
| 45052afb... | KLEBER NAPOLITANO DO ROSARIO | 8+ | vários |
| fcbae628... | FELIPE CAMPOS DE SOUZA | 6 | vários |
| 4b0b162d... | VINICIUS MARCANTUONO | 8+ | vários |
| 07c32525... | RAFAEL SENA SANTOS DE SOUZA | 5+ | vários |

### Alterações

**1. `src/pages/Equipes.tsx`**

- Buscar perfis completos via `supabase.from('profiles')` (com `id` e `user_id`) em vez de depender do `useProfiles` (que só tem `user_id`)
- Resolver nomes dos líderes usando `profiles.id` (não `user_id`)
- Buscar membros da equipe: `profiles WHERE reports_to = leader.id`
- No card de cada equipe, exibir duas seções:
  - **Membros**: lista de usuários subordinados (nome, área/sigla)
  - **Clientes**: lista de clientes vinculados (já existente)
- Corrigir o dialog de "Vincular Cliente" para usar `profiles.id` como `team_lead_id`

**2. `src/hooks/useTeamClients.ts`** (sem alteração estrutural)

O hook já funciona corretamente com a tabela. O problema é apenas na resolução de nomes no frontend.

### Layout do card atualizado

```text
┌─────────────────────────────────┐
│ JULIANA FERREIRA MARTINS PEREIRA│
│ 👥 12 membros  │  🏢 N clientes │
├─────────────────────────────────┤
│ ▾ Membros da Equipe             │
│   • Gabriel de Jesus Silva      │
│   • Gabriel Moreira             │
│   • Patricia de Moraes          │
│   • ...                         │
│ ▾ Clientes Vinculados           │
│   • Cliente ABC                 │
│   • Cliente XYZ                 │
│   (botão remover)               │
└─────────────────────────────────┘
```

### Arquivo

| Arquivo | Ação |
|---------|------|
| `src/pages/Equipes.tsx` | Reescrever: buscar profiles com `id`, exibir membros via `reports_to`, corrigir resolução de nomes |

