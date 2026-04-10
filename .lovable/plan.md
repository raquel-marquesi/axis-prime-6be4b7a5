

## Fix build errors in edge functions

### Issues identified

1. **`supabase/functions/import-timesheet-csv/index.ts`** — File contains corrupted git diff text instead of valid TypeScript. Needs full restoration from the diff content (the actual source is visible as deleted lines).

2. **`supabase/functions/delete-user/index.ts`** (line 93) — `catch(error)` is untyped (`unknown`). Fix: cast to `(error as Error).message` or use `String(error)`.

3. **`supabase/functions/parse-bank-statement/index.ts`** (line 286) — Same `unknown` error type issue.

4. **`getClaims` errors** in `ai-agent`, `batch-import-users`, `cross-check-calendar`, `google-calendar`, `google-drive`, `google-gmail` — `getClaims` doesn't exist on the Supabase JS v2 auth client. Replace with `getUser()` which returns the authenticated user from the JWT.

### Plan

| File | Fix |
|------|-----|
| `import-timesheet-csv/index.ts` | Restore valid TS from the diff (strip `-` prefixes from lines 11-378) |
| `delete-user/index.ts` | `catch (error: any)` or `(error as Error).message` |
| `parse-bank-statement/index.ts` | Same catch fix |
| `ai-agent/index.ts` | Replace `getClaims` with `getUser` |
| `batch-import-users/index.ts` | Replace `getClaims` with `getUser` |
| `cross-check-calendar/index.ts` | Replace `getClaims` with `getUser` |
| `google-calendar/index.ts` | Replace `getClaims` with `getUser` |
| `google-drive/index.ts` | Replace `getClaims` with `getUser` |
| `google-gmail/index.ts` | Replace `getClaims` with `getUser` |

All changes are minimal — just fixing TypeScript type errors to pass the Deno type checker.

