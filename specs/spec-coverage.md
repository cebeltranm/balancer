# Spec Coverage

## Generated Specs
- CONFIRMED: `specs/architecture.md`
- CONFIRMED: `specs/data-model.md`
- CONFIRMED: `specs/features/dashboard.md`
- CONFIRMED: `specs/features/transactions.md`
- CONFIRMED: `specs/features/expenses.md`
- CONFIRMED: `specs/features/accounts.md`
- CONFIRMED: `specs/features/values.md`
- CONFIRMED: `specs/features/budget.md`
- CONFIRMED: `specs/features/balance.md`
- CONFIRMED: `specs/features/investments.md`
- CONFIRMED: `specs/features/storage-sync.md`
- CONFIRMED: `specs/features/authentication.md`
- CONFIRMED: `specs/features/settings.md`
- CONFIRMED: `specs/features/local-dev-server.md`
- CONFIRMED: `specs/features/pwa.md`

## Main Files / Functions Mapped
- CONFIRMED: Architecture maps to `src/main.ts`, `src/App.vue`, `src/router/index.ts`, `vite.config.ts`, `src/helpers/files.ts`, `src/helpers/idb.ts`, `src/helpers/sync.ts`, `src/helpers/storage/*`, `src/components/Auth.vue`.
- CONFIRMED: Data model maps to `src/types.ts`, `src/stores/accounts.ts`, `src/stores/config.ts`, `src/stores/transactions.ts`, `src/stores/values.ts`, `src/stores/budget.ts`, `src/stores/balance.ts`, `src/helpers/files.ts`, `src/helpers/idb.ts`.
- CONFIRMED: Dashboard maps to `src/views/HomeView.vue`, `src/components/AccountValueCard.vue`, `useBalanceStore`, `useAccountsStore`, `useStorageStore`.
- CONFIRMED: Transactions maps to `src/views/Transactions.vue`, `src/components/TransactionEditDialog.vue`, `src/helpers/transactionForms.ts`, `useTransactionsStore`, `syncTransactions()`.
- CONFIRMED: Expenses maps to `src/views/Expenses.vue`, `useBudgetStore().getBudgetGrupedByPeriod()`, `useBalanceStore().getBalanceGroupedByPeriods()`, `useValuesStore().getValue()`.
- CONFIRMED: Accounts maps to `src/views/Accounts.vue`, `ACCOUNT_GROUP_TYPES`, `loadAccounts()`, `saveAccount()`, `activeAccounts()`, `accountsGroupByCategories()`, `deleteAccount()`.
- CONFIRMED: Values maps to `src/views/Values.vue`, `useValuesStore().getValue()`, `joinValues()`, `setValuesForMonth()`, `ensureCurrentMonthValues()`, stock/currency sync functions in the view.
- CONFIRMED: Budget maps to `src/views/Budget.vue`, `useBudgetStore().loadBudgetForYear()`, `getBudgetGrupedByPeriod()`, `setBudgetForYear()`.
- CONFIRMED: Balance maps to `src/views/Balance.vue`, `useBalanceStore().loadBalanceForYear()`, `getBalanceGroupedByPeriods()`, `ensureCurrentMonthBalance()`, `recalculateBalance()`.
- CONFIRMED: Investments maps to `src/views/portafolio/index.vue`, `src/views/portafolio/table.vue`, `src/views/portafolio/pie.vue`, `src/views/portafolio/bar.vue`, `src/helpers/investments.ts`, `src/composables/totalByCategory.ts`, config composition getters.
- CONFIRMED: Storage sync maps to `useStorageStore()`, `readJsonFile()`, `writeJsonFile()`, `idb.ts`, `syncTransactions()`, `syncFiles()`, `DropboxStore`, `HttpServerStore`.
- CONFIRMED: Authentication maps to `src/components/Auth.vue`, `src/App.vue`, router guard, storage provider helpers, and `useStorageStore().logout()` / `resetLocalCredentials()`.
- CONFIRMED: Settings maps to `src/views/Settings.vue`, `useConfigStore().loadConfig()`, `saveConfig()`, storage login/reset actions.
- CONFIRMED: Local dev server maps to `server/index.js`, `src/helpers/storage/http_server.ts`, and provider selection in `src/helpers/storage/index.ts`.
- CONFIRMED: PWA maps to `vite.config.ts`, `src/helpers/pwa.ts`, and `App.vue` update toast behavior.

## Tests That Cover Specs
- CONFIRMED: Account/data-model/account behavior is covered by `src/stores/__tests__/accounts.spec.ts`.
- CONFIRMED: Transaction load/save/delete and sync merge behavior is covered by `src/stores/__tests__/transactions.spec.ts` and `src/helpers/__tests__/sync.spec.ts`.
- CONFIRMED: Values lookup/bootstrap/save behavior is covered by `src/stores/__tests__/values.spec.ts`.
- CONFIRMED: Budget load/group/save behavior is covered by `src/stores/__tests__/budget.spec.ts`.
- CONFIRMED: Balance grouping/current-month recalculation behavior is covered by `src/stores/__tests__/balance.spec.ts`.
- CONFIRMED: Config composition and save behavior is covered by `src/stores/__tests__/config.spec.ts`.
- CONFIRMED: Storage state, file cache, IndexedDB, sync, provider selection, and HTTP client behavior are covered by `src/stores/__tests__/storage.spec.ts`, `src/helpers/__tests__/files.spec.ts`, `src/helpers/__tests__/idb.spec.ts`, `src/helpers/__tests__/sync.spec.ts`, `src/helpers/__tests__/storageIndex.spec.ts`, and `src/helpers/__tests__/httpServer.spec.ts`.
- CONFIRMED: Investment helper behavior is covered by `src/helpers/__tests__/investments.spec.ts`.
- CONFIRMED: Period grouping/date helper behavior is covered by `src/helpers/__tests__/groupData.spec.ts` and `src/helpers/__tests__/options.spec.ts`.
- CONFIRMED: PWA registration helper is covered by `src/helpers/__tests__/pwa.spec.ts`.
- CONFIRMED: Browser desktop helper used by responsive views is covered by `src/helpers/__tests__/browser.spec.ts`.

## Code Areas Without Specs
- CONFIRMED: `src/format.ts` has no dedicated spec beyond references from feature specs.
- CONFIRMED: `src/layout/AppMenu.vue` and `src/layout/AppTopbar.vue` are only covered by architecture-level navigation notes.
- CONFIRMED: `src/components/TransactionExpenseDialog.vue`, `TransactionTransferDialog.vue`, and `TransactionTypeDialog.vue` are not covered in detail because the main transaction view currently uses `TransactionEditDialog.vue`.
- CONFIRMED: `src/components/AccountsSelector.vue`, `PeriodSelector.vue`, and `CommentsDialog.vue` are covered only as supporting components.
- CONFIRMED: `src/claims-sw.ts`, `src/prompt-sw.ts`, `src/worker.js`, and `src/workerImport.js` are covered only at a high level by PWA/architecture notes.
- CONFIRMED: Styling files under `src/assets/styles/` are not specified.
- CONFIRMED: Public icons, favicon, and robots/static HTML are not specified beyond PWA manifest/icon references.

## Specs With Weak Evidence
- INFERRED: Storage conflict behavior in `architecture.md` and `storage-sync.md` is based on merge/overwrite code paths, not explicit product tests.
- INFERRED: Dashboard startup dependencies are inferred from `Auth.vue` loading behavior rather than a rendered dashboard test.
- INFERRED: Account legacy/migration concerns are inferred from `public/accounts.json` and enum mismatches.
- INFERRED: Missing exchange-rate impact in expenses/investments is inferred from conversion code paths.
- UNCLEAR: Runtime service-worker behavior is weakly evidenced because generated service-worker output is not inspected or specified.
- UNCLEAR: WebAuthn failure handling is weakly evidenced because no tests cover `navigator.credentials` failures.
- INFERRED: Versionless JSON compatibility is only partially evidenced: current tests cover simple current shapes, but do not comprehensively cover additive defaults, ignored deprecated structures, or prohibiting file renames/top-level shape replacements.

## Spec Quality Review

### Testability
- CONFIRMED: Feature specs now use observable Given/When/Then-style acceptance criteria for primary read, write, validation, route-gating, sync, and update flows.
- CONFIRMED: Data-model specs identify exact file names, primary shapes, reference relationships, and persistence/cache flags that can be tested at store/helper level.
- CONFIRMED: Current automated test mapping is strongest for stores and helpers.
- UNCLEAR: Rendered component behavior, provider integration, generated PWA output, and end-to-end flows still need explicit test strategy before they are fully testable.

### Acceptance Criteria Concreteness
- CONFIRMED: Dashboard, transactions, accounts, expenses, investments, values, budget, balance, settings, storage sync, authentication, local dev server, and PWA specs include concrete observable criteria.
- CONFIRMED: Acceptance criteria that involve persistence name the affected JSON file or IndexedDB state.
- CONFIRMED: Acceptance criteria that involve validation include the invalid input and expected blocking behavior where current behavior is known.
- UNCLEAR: Error criteria remain intentionally incomplete where the product has not defined user-visible failure states.

### INFERRED / UNCLEAR Hygiene
- CONFIRMED: Inferred statements are marked with `INFERRED` when they are derived from code paths or cross-file reasoning rather than explicit product intent.
- CONFIRMED: Ambiguous behavior is marked with `UNCLEAR` and repeated in Product Questions where a product-owner decision is needed.
- CONFIRMED: No reviewed spec relies on unmarked `TODO`, `TBD`, or unqualified "should" language for required behavior.

### Vague Versus Implementation-Heavy Areas
- CONFIRMED: The specs intentionally name implementation files because they are reverse-engineered from the current app and used for traceability.
- INFERRED: Some implementation detail is higher than ideal for future-facing specs, especially in architecture, storage sync, values external-provider behavior, and PWA generated output.
- UNCLEAR: The specs do not yet distinguish immutable product requirements from current implementation details in a formal way beyond `CONFIRMED`, `INFERRED`, and `UNCLEAR`.

### Missing Product Flows
- UNCLEAR: First-run onboarding, including missing `accounts.json` seeding and what the user sees before setup completes.
- UNCLEAR: Failed sync and retry recovery after local writes have been accepted.
- UNCLEAR: Multi-device conflict review or conflict recovery.
- UNCLEAR: Lost local WebAuthn credential recovery when provider credentials still exist.
- UNCLEAR: Missing/stale exchange-rate handling in expenses, investments, values, and balance recalculation.
- UNCLEAR: Account deletion when historical files reference the account.
- UNCLEAR: Manual or user-triggered balance recalculation when stored balances appear stale.
- UNCLEAR: Offline usage contract beyond cached app shell and already-cached IndexedDB data.

### Cross-Spec Contradictions / Tensions
- CONFIRMED: No direct route-access contradiction was found; `/` and `/expenses` are consistently described as unprotected, while `/balance`, `/investments`, `/settings/general`, and `/settings/accounts` require authentication.
- CONFIRMED: No direct data-file naming contradiction was found across product overview, data model, and feature specs.
- INFERRED: There is a product tension between PWA "offline-ready assets" and storage sync requirements; app shell can be offline-ready while fresh remote JSON data cannot be guaranteed offline.
- INFERRED: There is a product tension between allowing account deletion and treating account ids as durable references across historical files.
- INFERRED: There is a product tension between edit-as-delete-plus-new-transaction-id and any future requirement for stable transaction identity or audit history.
- UNCLEAR: Google Drive is listed as planned/unavailable; no feature spec should treat it as an implemented provider until product scope changes.

## Highest-Priority Product Owner Questions
- UNCLEAR: What is the required conflict-resolution policy when two devices edit the same transaction month or whole JSON file before syncing?
- UNCLEAR: Should account deletion be blocked, archived, cascaded, or allowed to leave historical references intact?
- UNCLEAR: What user-visible error and retry model should be used for failed sync, provider login, WebAuthn, external value providers, and missing conversion rates?
- UNCLEAR: What is the intended first-run onboarding flow after storage login and default `accounts.json` seeding?
- UNCLEAR: What offline behavior does the product promise: app shell only, read-only cached data, queued edits, or full offline workflows?
- UNCLEAR: Should balance snapshots be treated as rebuildable cache with a force-recalculate action, or as durable financial records?
- UNCLEAR: Should transaction edits preserve ids for history/audit purposes or continue using delete-plus-new-id?

## Recommended Next Specs To Write
- CONFIRMED: `specs/features/transaction-dialogs.md` for transaction type-specific dialog components and expected flow, if those components are still intended to be active.
- CONFIRMED: `specs/features/selectors-and-shared-components.md` for account selector, period selector, comments dialog, and account value cards.
- CONFIRMED: `specs/validation-and-errors.md` consolidating visible validation rules and user-facing error expectations.
- CONFIRMED: `specs/compatibility.md` defining the versionless JSON compatibility policy, additive default requirements, ignored deprecated structures, prohibited renames, legacy account type handling, and account deletion/reference policy.
- CONFIRMED: `specs/sync-conflicts.md` defining conflict resolution for multi-device edits.
- CONFIRMED: `specs/security.md` defining local credential, provider token, and PWA cache security expectations.
- CONFIRMED: `specs/testing-strategy.md` for rendered component, integration, and service-worker coverage beyond current unit tests.
