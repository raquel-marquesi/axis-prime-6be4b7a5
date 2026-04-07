## Plano: Sincronizar "baixa" de prazos via planilha de produção

### Contexto

A planilha `14HZnCn1bWUSkIOOQPtnxwv79V08s2veNNAUrn0uMQOo` é alimentada em tempo real pelo sistema oficial e contém registros de produção (lançamentos de timesheet). A existência de um registro com o mesmo `numero_processo` (CNJ) e data compatível com o prazo indica que o prazo foi cumprido.

Atualmente há **1.680 prazos abertos** no sistema. A sincronização de baixa cruzará esses registros com a planilha.

### Lógica de baixa

Para cada prazo aberto (`is_completed = false`):

1. Buscar na planilha registros onde `numero_processo` = CNJ do prazo
2. Se existe registro com `data_lancamento` (ou `data`) dentro de uma janela de ±7 dias do `data_prazo`, marcar como concluído
3. Preencher `completed_at` com a `data_lancamento` da planilha
4. Preencher `completed_by` com o `user_id` do profissional (match por nome via `profiles.full_name`)

### Colunas relevantes da planilha


| Coluna planilha            | Uso                                                   |
| -------------------------- | ----------------------------------------------------- |
| `numero_processo`          | Match com `processes.numero_processo`                 |
| `data_lancamento` / `data` | Data de cumprimento                                   |
| `profissional`             | Match com `profiles.full_name` para `completed_by`    |
| `tipo_atividade`           | Armazenado em `completion_notes` para rastreabilidade |


### Implementação

#### 1. Criar Edge Function `sync-baixa-prazos`

**Arquivo:** `supabase/functions/sync-baixa-prazos/index.ts`

Fluxo:

1. Autenticar via Google Service Account (mesmo padrão de `sync-email-agendamentos`)
2. Ler planilha `14HZnCn1bWUSkIOOQPtnxwv79V08s2veNNAUrn0uMQOo` (aba principal ou todas)
3. Indexar registros da planilha por `numero_processo` normalizado
4. Consultar prazos abertos com JOIN em `processes` para obter `numero_processo`
5. Para cada prazo aberto, verificar se existe match na planilha (CNJ + data dentro de ±7 dias)
6. Se match encontrado: `UPDATE process_deadlines SET is_completed = true, completed_at = data_lancamento, completed_by = user_id_do_profissional`
7. Retornar contagem de baixas realizadas

#### 2. Agendar via pg_cron

Executar a cada 2 horas (mesmo ciclo do `sync-email-agendamentos`):

```sql
SELECT cron.schedule(
  'sync-baixa-prazos',
  '15 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pojnrtgqigouahmdanze.supabase.co/functions/v1/sync-baixa-prazos',
    headers := '{"Authorization": "Bearer ...", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

#### 3. Detalhes de matching

```text
Planilha (produção)              process_deadlines
─────────────────────            ──────────────────
numero_processo  ──────match───► processes.numero_processo → process_id
data_lancamento  ──────±7d────► data_prazo
profissional     ──────match───► profiles.full_name → user_id → completed_by
```

- Normalizar CNJ: remover pontos, traços, espaços
- Normalizar profissional: UPPER + unaccent para match fuzzy
- Só processar prazos com `data_prazo` nos últimos 90 dias (evitar reprocessar histórico antigo)

### Resultado

- 1.680 prazos abertos serão verificados automaticamente contra a planilha oficial
- Baixas refletem no relatório de prazos, KPIs e dashboard. Lembre-se de registrar não só a data da baixa, mas também o usuário que cumpriu o prazo e o tipo de atividade cumprido. Mesmo que o prazo tenha sido cumprido como atrasado, ele consta como cumprido. Dúvidas sobre eventual usuário e/ou data devem ser questionadas. 
- &nbsp;
- Ciclo automático a cada 2 horas garante sincronia quase real-time  

- Sem alteração no sistema oficial — leitura passiva (read-only)