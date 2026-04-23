

## Implementar lógica real em `ImportarPautas.tsx`

### Objetivo
Substituir o stub atual por um pipeline funcional que parseia `.xlsx`/`.csv` no frontend, resolve `process_id` e `assigned_to`, chama `core_create_deadline` por linha (idempotente), exibe progress bar e resumo final (inseridos / atualizados / erros).

### Mudanças

**1. Adicionar dependência `xlsx`** (`^0.18.5`) ao `package.json`.

**2. Reescrever `src/pages/ImportarPautas.tsx`** com:

- **Parsing**: detectar extensão; `.xlsx` lido como `arrayBuffer` via `XLSX.read(buf, { type: 'array', cellDates: true })`; `.csv` lido como string via `file.text()` + `XLSX.read(text, { type: 'string' })`. Primeira aba → `XLSX.utils.sheet_to_json` com headers normalizados (lowercase + trim).
- **Colunas aceitas** (case-insensitive): `numero_processo`, `data_prazo`, `ocorrencia`, `detalhes` (opc.), `assigned_to` (opc., email **ou** nome).
- **Pré-cargas em batch** (1 query cada antes do loop, evita N+1):
  - `processes`: `select id, numero_processo` filtrando `in('numero_processo', uniqueNumsNormalizados)` → `Map<cnj, uuid>`.
  - `profiles`: `select user_id, full_name, email` filtrando os emails/nomes únicos do arquivo → dois Maps (`email→user_id`, `lower(full_name)→user_id`).
- **Normalização**:
  - CNJ: remover espaços e caracteres não-numéricos exceto `.` `-` (`mem://logic/data-normalization-rules`).
  - Data: aceita `Date` (cellDates), ISO, `dd/mm/yyyy`, `yyyy-mm-dd` → grava `YYYY-MM-DD`. Inválida → erro na linha.
- **Loop sequencial** sobre as linhas:
  1. Valida obrigatórios (`numero_processo`, `data_prazo`, `ocorrencia`).
  2. Resolve `process_id` no Map → erro `"processo não encontrado"` se faltar.
  3. Resolve `assigned_to` (email primeiro, depois nome; `null` se ausente — alinhado a `webhook-prazos`).
  4. `supabase.rpc('core_create_deadline', { payload: { process_id, data_prazo, ocorrencia, detalhes, assigned_to, source: 'importacao_planilha' } })`.
  5. Inspeciona resposta: `action === 'inserted'` → `inserted++`; `'updated_duplicate' | 'updated_duplicate_external'` → `updated++`; `success === false` ou throw → `errors.push({ row: i+2, message })`.
- **Progress bar** (`<Progress />` já existe): atualiza após cada linha (`(processed/total)*100`).
- **Resumo final** em card abaixo: três contadores + lista expansível de erros (linha + mensagem).
- **Toast único** ao concluir: `"Importação concluída"`.

### Layout pós-import

```text
┌──────────────────────────────────────────────┐
│ Selecionar Arquivo                           │
│ [input file] [Importar Dados]                │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░  62%  (124/200)           │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ Resumo                                        │
│ Inseridos: 87   Atualizados: 35   Erros: 2   │
│ ▸ Linha 14: processo não encontrado          │
│ ▸ Linha 91: data_prazo inválida              │
└──────────────────────────────────────────────┘
```

### Snippet de referência (núcleo do loop)

```ts
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  try {
    const processId = processMap.get(normalizeCnj(row.numero_processo));
    if (!processId) throw new Error('processo não encontrado');
    const assigned = resolveAssigned(row.assigned_to, emailMap, nameMap);
    const dataPrazo = parseDate(row.data_prazo);

    const { data, error } = await supabase.rpc('core_create_deadline', {
      payload: {
        process_id: processId,
        data_prazo: dataPrazo,
        ocorrencia: String(row.ocorrencia).trim(),
        detalhes: row.detalhes?.toString().trim() || null,
        assigned_to: assigned,
        source: 'importacao_planilha',
      },
    });
    if (error) throw error;
    const r = data as { success: boolean; action?: string; error?: string };
    if (!r.success) throw new Error(r.error ?? 'rpc falhou');
    if (r.action === 'inserted') inserted++; else updated++;
  } catch (e) {
    errors.push({ row: i + 2, message: (e as Error).message });
  }
  setProgress(Math.round(((i + 1) / rows.length) * 100));
}
```

### Detalhes técnicos

- **`core_create_deadline`** já existe e recebe `process_id` (uuid). Precisamos resolver `numero_processo → process_id` no frontend antes de chamar — RPC não aceita CNJ direto.
- **`xlsx` no bundle**: ~430KB minificado. Aceitável (tela admin, uso esporádico). Sem lazy-load nesta iteração.
- **Idempotência**: garantida server-side pela RPC + UNIQUE `(process_id, data_prazo, ocorrencia)` (`mem://database/deadlines-constraints`).
- **RLS de `process_deadlines`**: a RPC é `SECURITY DEFINER`, então roda com privilégio elevado independente do role do chamador.
- **Página preservada**: confirmado como canal #4 do mapeamento de ingestão; rota `/importar-pautas` permanece sob `ProtectedRoute`.

### Arquivos afetados
- `package.json` — adiciona `"xlsx": "^0.18.5"`.
- `src/pages/ImportarPautas.tsx` — reescrita completa.

### Fora do escopo
- Restringir a página por role.
- Download de template `.xlsx`.
- Modo "dry-run" (preview antes de gravar).
- Suporte a múltiplas abas no mesmo workbook.

