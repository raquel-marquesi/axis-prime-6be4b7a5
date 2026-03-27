

# Plan: Import Frontend from Axis to Axis Final

## Overview
Copy the entire frontend codebase from the [Axis](/projects/3743ffcc-098a-4cb7-9157-2b7bc346a365) project into this project, preserving the current Supabase connection (`src/integrations/supabase/`).

## What will be copied

### Root files (3 files)
- `tailwind.config.ts` — identical structure, no changes needed
- `components.json` — identical structure, no changes needed
- `index.html` — updated with Marquesi branding, favicon, and Portuguese lang

### `public/` directory (4 files)
- `favicon.ico`, `favicon.png`, `placeholder.svg`, `robots.txt`
- `temp/timesheet.xlsx`

### `src/` directory (everything except `src/integrations/supabase/`)

| Folder | Files |
|--------|-------|
| `src/assets/` | `logo.png` |
| `src/contexts/` | `AuthContext.tsx` |
| `src/types/` | `auth.ts`, `calendar.ts` |
| `src/lib/` | `utils.ts`, `validators.ts`, `taxCalculations.ts` |
| `src/hooks/` | 59 custom hooks (useClients, useProcesses, useTimesheet, etc.) |
| `src/pages/` | 14 pages (Auth, Dashboard, Clients, Processes, Financeiro, etc.) |
| `src/components/layout/` | MainLayout, Sidebar, RoleSimulationBanner |
| `src/components/dashboard/` | 20 widgets (Calendar, Gmail, Drive, Finance, etc.) |
| `src/components/clients/` | 9 files + `form/` subfolder (8 files) |
| `src/components/processes/` | 8 files |
| `src/components/financeiro/` | 46 files |
| `src/components/timesheet/` | 3 files |
| `src/components/solicitacoes/` | 7 files |
| `src/components/users/` | 8 files |
| `src/components/configuracoes/` | 11 files |
| `src/components/premiacao/` | 4 files |
| `src/components/relatorios/` | 5 files |
| `src/components/pautas/` | 1 file |
| `src/components/calendar/` | 5 files |
| `src/components/ai/` | 2 files |
| `src/components/ui/` | 48 UI components (shadcn) |
| Root `src/` files | `App.tsx`, `App.css`, `index.css`, `main.tsx`, `NavLink.tsx`, `ProtectedRoute.tsx`, `vite-env.d.ts` |

## What will NOT be touched
- `src/integrations/supabase/client.ts` — keeps current connection
- `src/integrations/supabase/types.ts` — keeps current types
- `.env` — keeps current Supabase credentials
- `supabase/config.toml` — keeps current config

## Execution approach
1. Copy all files from the Axis project using `cross_project--read_project_file` and write them to this project
2. Update `src/App.tsx` to use the Axis routing structure with AuthProvider, ProtectedRoute, and all page routes
3. Copy `src/index.css` with the Marquesi design system (custom HSL colors, dark mode, print styles)
4. Copy all hooks, components, pages, contexts, types, and lib files
5. Copy public assets (favicon, logo, timesheet template)
6. Verify the Supabase imports in copied files point to `@/integrations/supabase/client`

## Technical note
This is a large operation (~200+ files). The implementation will be done in batches, prioritizing core structure first (App.tsx, layouts, contexts), then pages, then components and hooks.

