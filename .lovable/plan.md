

## Excluir botões de importação e funções associadas da aba Processos

### Arquivos a excluir

| Arquivo | Motivo |
|---------|--------|
| `src/components/processes/BulkImportXlsxDialog.tsx` | Componente "Importar XLSX/CSV" |
| `src/components/processes/BatchImportProcessesDialog.tsx` | Componente "Importar Teste" |
| `supabase/functions/bulk-import-data/index.ts` | Edge function usada apenas pelo BulkImportXlsxDialog |
| `supabase/functions/import-csv-processes/index.ts` | Edge function usada apenas pelo BulkImportXlsxDialog |
| `supabase/functions/batch-import-processes/index.ts` | Edge function usada apenas pelo BatchImportProcessesDialog |
| `supabase/functions/xlsx-direct-import/index.ts` | Edge function sem uso no frontend |

### Arquivo a editar

**`src/pages/Processes.tsx`** — Remover:
- Imports dos dois dialogs e dos ícones `Upload`, `FileSpreadsheet`
- Estados `isImportOpen` e `isBulkImportOpen`
- Os dois botões "Importar XLSX/CSV" e "Importar Teste"
- Os dois componentes de dialog no JSX

### Edge Functions a remover do Supabase (deploy)

Usar a ferramenta `supabase--delete_edge_functions` para remover as 4 funções deployadas:
- `bulk-import-data`
- `import-csv-processes`
- `batch-import-processes`
- `xlsx-direct-import`

