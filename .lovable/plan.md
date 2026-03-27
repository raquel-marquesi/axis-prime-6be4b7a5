

# Plan: Complete Migration — Remaining Files

## Summary
The majority of the frontend is still placeholder stubs. There are **~150 files** remaining to copy from the original Axis project. Here's what's missing:

## Missing Hooks (37 hooks not yet copied)
`useActivityTypes`, `useAllProcessDeadlines`, `useBankAccountsConfig`, `useBankReconciliation`, `useBanks`, `useBillingContacts`, `useBoletos`, `useCalendarSync`, `useChartOfAccounts`, `useClientDocuments`, `useClientSlaRules`, `useCollectiveProcessParticipants`, `useCompanyEntities`, `useContractExtraction`, `useContractMonitor`, `useContractPricing`, `useCostCenters`, `useCrossCheckCalendar`, `useDREReport`, `useDeadlineCompletion`, `useDeadlineWithCalendar`, `useDrive`, `useExpenseSplits`, `useFinanceReports`, `useFinancialGroups`, `useGmail`, `useMonitoredEmails`, `useNfse`, `useOverdueDeadlines`, `useOverdueTimesheetMap`, `useProcessWithFolder`, `useProducaoWidget`, `useRelatedProcesses`, `useReportData`, `useSyncStatus`, `useTaxRules`, `useTeamClients`

## Missing / Stub Components

### `components/clients/` (3 missing + 6 stubs)
- **Missing**: `form/` subfolder (8 files), `ContactFormDialog`, `ContractExtractionDialog`
- **Stubs**: `ClientsTable`, `ClientsCards`, `ClientFormDialog`, `ClientDetailsDialog`, `BatchImportClientsDialog`, `ClientDataExportButton`

### `components/financeiro/` (43 missing + 4 stubs)
- **Missing**: 43 files (AccountsTable, InvoicesTable, ExpensesTable, DREReport, BankReconciliation, NfseTab, TaxSimulator, etc.)
- **Stubs**: `FinanceSummary`, `FinanceTable`, `FinanceCharts`, `AddTransactionDialog`

### `components/dashboard/` (16 missing + 4 stubs)
- **Missing**: `CalendarWidget`, `GmailWidget`, `DriveWidget`, `ProducaoWidget`, `GoalProgressWidget`, `PrazosAtrasadosWidget`, `SyncStatusWidget`, `BonusWidget`, `SolicitacoesPendentesWidget`, `ComposeEmailDialog`, `CreateEventDialog`, `FullCalendarView`, `LinkClientPopover`, `LinkUserPopover`, `SyncErrorsDialog`, `index.ts`
- **Stubs**: `BonusGaugeWidget`, `CoordinatorDashboard`, `FinanceDashboard`, `ManagerDashboard`

### `components/processes/` (3 missing + 5 stubs)
- **Missing**: `DeadlineCompletionDialog`, `DeadlinesTab`, `RelatedProcessesTab`
- **Stubs**: all 5 existing files

### `components/solicitacoes/` (entire folder missing — 7 files)
### `components/timesheet/` (entire folder missing — 3 files)
### `components/users/` (7 missing, 1 stub)
- **Missing**: `AddToTeamDialog`, `BatchImportUsersDialog`, `EditUserDialog`, `InviteUserDialog`, `PermissionsByProfile`, `PermissionsByUser`, `TeamMembersView`, `index.ts`

### `components/configuracoes/` (6 missing + 5 stubs)
- **Missing**: `BankAccountsTab`, `BanksTab`, `BranchesTab`, `CompanyEntitiesTab`, `CostCentersTab`, `EmpresaseFiliaisTab`, `FinancialGroupsTab`, `MonitoredEmailsTab`, `RolesManagerTab`, `TeamsOverviewTab`, `EconomicGroupsTab`

### `components/premiacao/` (4 stubs need replacement)
### `components/relatorios/` (4 missing + 1 stub)
### `components/calendar/` (1 missing + stubs)
- **Missing**: `CrossCheckCalendarDialog`, `index.ts`

### `components/pautas/` (1 missing)
- `PautasPendentesCard`

### `components/ui/` — likely already present from shadcn, no action needed

## Pages (14 exist but some need real implementations)
The pages were copied but reference stub components — they'll work once components are real.

## Execution approach
Due to the volume (~150 files), this will be done in **5-6 batches**:

1. **Batch 1**: All 37 missing hooks
2. **Batch 2**: `clients/` (real components + form subfolder), `processes/` (real components)
3. **Batch 3**: `dashboard/` (all 20 real components), `calendar/` remaining
4. **Batch 4**: `financeiro/` (all 47 real components) — largest batch
5. **Batch 5**: `solicitacoes/`, `timesheet/`, `users/`, `configuracoes/`, `premiacao/`, `relatorios/`, `pautas/`
6. **Batch 6**: Any remaining pages that need updates + final verification

Each batch will read files from the Axis project and write them to this project, replacing stubs with real implementations.

