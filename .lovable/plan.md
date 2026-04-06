

## Corrigir relatório de Prazos — dados ausentes

### Problemas encontrados

| Problema | Impacto |
|----------|---------|
| Coluna `client_id` não existe na tabela `processes` — o nome correto é `id_cliente` | Nenhum nome de cliente aparece (todos "—") |
| Query busca apenas `numero_processo` mas ignora `reclamante_nome`, `reclamadas`, `area`, `numero_pasta` | Relatório sem informações relevantes do processo |
| 1.144 prazos abertos > limite de 1.000 do SDK Supabase | ~144 prazos nunca aparecem no relatório |
| Sub-relatórios (por profissional, equipe, cliente) também usam `client_id` errado e sofrem do limite de 1.000 | Contagens incorretas em todos os sub-relatórios |

### Solução

Criar uma função RPC no Postgres que faz o JOIN direto no servidor, eliminando o limite de 1.000 e retornando todos os campos relevantes de uma vez.

### 1. Migration SQL — criar RPC `get_prazos_abertos_report`

```sql
CREATE OR REPLACE FUNCTION public.get_prazos_abertos_report()
RETURNS TABLE(
  id uuid,
  processo text,
  numero_pasta text,
  reclamante text,
  reclamadas text,
  area text,
  cliente text,
  ocorrencia text,
  data_prazo date,
  responsavel text,
  source text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    pd.id,
    COALESCE(pr.numero_processo, '—'),
    COALESCE(pr.numero_pasta, '—'),
    COALESCE(pr.reclamante_nome, '—'),
    COALESCE(array_to_string(pr.reclamadas, ', '), '—'),
    COALESCE(pr.area, '—'),
    COALESCE(c.razao_social, c.nome, '—'),
    COALESCE(pd.ocorrencia, '—'),
    pd.data_prazo,
    COALESCE(p.full_name, 'Não atribuído'),
    COALESCE(pd.source, '—')
  FROM process_deadlines pd
  LEFT JOIN processes pr ON pr.id = pd.process_id
  LEFT JOIN clients c ON c.id = pr.id_cliente
  LEFT JOIN profiles p ON p.user_id = pd.assigned_to
  WHERE pd.is_completed = false
  ORDER BY pd.data_prazo ASC;
$$;
```

### 2. Editar `src/hooks/usePrazosReport.ts`

**`usePrazosAbertosReport`** — substituir as múltiplas queries por uma chamada `supabase.rpc('get_prazos_abertos_report')`. Calcular `status_prazo` e `dias_atraso` no frontend a partir de `data_prazo`.

**`usePrazosPorProfissionalReport`**, **`usePrazosPorEquipeReport`**, **`usePrazosPorClienteReport`** — corrigir `client_id` → `id_cliente` nas queries de processos. Usar paginação (range 0-4999) para superar o limite de 1.000 nos dados de `process_deadlines` usados nos agrupamentos.

### 3. Editar `src/components/relatorios/PrazosReport.tsx`

Adicionar colunas na tabela e no export CSV:
- **Nº Pasta** (`numero_pasta`)
- **Reclamante** (`reclamante`)
- **Reclamada(s)** (`reclamadas`)
- **Área** (`area`)

### Resultado

- Todos os 1.144+ prazos abertos aparecerão no relatório (sem limite de 1.000)
- Colunas de processo, reclamante, reclamadas, área e cliente preenchidas corretamente
- Export CSV incluirá todos os campos relevantes
- Sub-relatórios com contagens precisas

