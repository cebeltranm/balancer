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
- CONFIRMED: `specs/testing-strategy.md` (RT-031)

## Main Files / Functions Mapped
- CONFIRMED: Architecture maps to `src/main.ts`, `src/App.vue`, `src/router/index.ts`, `vite.config.ts`, `src/helpers/files.ts`, `src/helpers/idb.ts`, `src/helpers/sync.ts`, `src/helpers/storage/*`, `src/components/Auth.vue`.
- CONFIRMED: Data model maps to `src/types.ts`, `src/stores/accounts.ts`, `src/stores/config.ts`, `src/stores/transactions.ts`, `src/stores/values.ts`, `src/stores/budget.ts`, `src/stores/balance.ts`, `src/helpers/files.ts`, `src/helpers/idb.ts`.
- CONFIRMED: Dashboard maps to `src/views/HomeView.vue`, `src/components/AccountValueCard.vue`, `useBalanceStore`, `useAccountsStore`, `useStorageStore`.
- CONFIRMED: Transactions maps to `src/views/Transactions.vue`, `src/components/TransactionEditDialog.vue`, `src/helpers/transactionForms.ts`, `useTransactionsStore`, `syncTransactions()`.
- CONFIRMED: Expenses maps to `src/views/Expenses.vue`, `useBudgetStore().getBudgetGrupedByPeriod()`, `useBalanceStore().getBalanceGroupedByPeriods()`, `useValuesStore().getValue()`.
- CONFIRMED: Accounts maps to `src/views/Accounts.vue`, `ACCOUNT_GROUP_TYPES`, `loadAccounts()`, `saveAccount()`, `activeAccounts()`, `accountsGroupByCategories()`, and blocked `deleteAccount()`.
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
- CONFIRMED: Currency formatting and top-bar MXN selection/display are covered by `src/helpers/__tests__/format.spec.ts` and `src/layout/__tests__/AppTopbar.spec.ts`.

## Code Areas Without Specs
- CONFIRMED: `src/format.ts` has focused MXN currency-formatting coverage; other formatter functions are covered only through feature usage.
- CONFIRMED: `src/layout/AppMenu.vue` is covered only by architecture-level navigation notes; `src/layout/AppTopbar.vue` has focused MXN currency-selector coverage.
- CONFIRMED: `src/components/TransactionExpenseDialog.vue`, `TransactionTransferDialog.vue`, and `TransactionTypeDialog.vue` are not covered in detail because the main transaction view currently uses `TransactionEditDialog.vue`.
- CONFIRMED: `src/components/AccountsSelector.vue`, `PeriodSelector.vue`, and `CommentsDialog.vue` are covered only as supporting components.
- CONFIRMED: `src/claims-sw.ts`, `src/prompt-sw.ts`, `src/worker.js`, and `src/workerImport.js` are covered only at a high level by PWA/architecture notes.
- CONFIRMED: Styling files under `src/assets/styles/` are not specified.
- CONFIRMED: Public icons, favicon, and robots/static HTML are not specified beyond PWA manifest/icon references.

## Spec Convention (RT-030)
- CONFIRMED: `## Product Contract` states intended, observable behavior that must be preserved. Markers: `REQUIRED`, `RESOLVED (RT-xxx)`, and `UNCLEAR` only while a product decision is pending.
- CONFIRMED: `## Observed Implementation` records current code traceability: files, functions, tests, and quirks. Markers: `CONFIRMED`, `INFERRED`. It is never a requirement by itself.
- CONFIRMED: Each Product Contract item should carry a contract status in Observed Implementation (`satisfied`, `partially satisfied`, `not satisfied`) with covering tests.
- CONFIRMED: Acceptance criteria derive from the Product Contract. If Observed Implementation conflicts with the Product Contract, the code is a bug or a pending product decision.
- CONFIRMED: Every feature spec in `specs/features/` uses these headings; the former `Current Implemented Behavior` heading no longer exists.
- CONFIRMED: Test expectations: tests cite the spec's Product Contract rather than implementation details; a Product Contract item without a covering test is listed under Missing Tests / Coverage Gaps.

## Specs With Weak Evidence
- CONFIRMED: Storage conflict behavior is specified and implemented for the current scope: transaction merge-by-id and whole-file last writer wins with a visible warning.
- INFERRED: Dashboard startup dependencies are inferred from `Auth.vue` loading behavior rather than a rendered dashboard test.
- INFERRED: Account legacy/migration concerns are inferred from `public/accounts.json` and enum mismatches.
- CONFIRMED: Missing exchange-rate behavior is specified by RT-011: expense and investment UI summaries must show partial totals with a visible missing-rate indicator listing affected currencies/accounts, and must not silently coerce missing rates to zero.
- RESOLVED: Service-worker behavior is specified by RT-025 in `specs/features/pwa.md`: registration failure is console-only, and generated manifest/precache output should be asserted in build tests where practical. Implemented: `onRegisterError` logs to console only (`src/helpers/pwa.ts`); tests in `pwa.spec.ts` and `pwaBuild.spec.ts`.
- RESOLVED: WebAuthn failure handling is specified by RT-020 (shared auth error state with retry, reset local credentials, and provider-login restart). Current code satisfies it (`Auth.vue`, `src/stores/storage.ts`, `dropbox.ts`) with tests in `Auth.spec.ts`, `dropbox.spec.ts`, and `storage.spec.ts`.
- CONFIRMED: Versionless JSON compatibility is covered by `src/helpers/__tests__/persistedShapes.spec.ts` and persisted-family store tests for current names, additive defaults, and ignored deprecated structures.

## Spec Quality Review

### Testability
- CONFIRMED: Feature specs now use observable Given/When/Then-style acceptance criteria for primary read, write, validation, route-gating, sync, and update flows.
- CONFIRMED: Data-model specs identify exact file names, primary shapes, reference relationships, and persistence/cache flags that can be tested at store/helper level.
- CONFIRMED: Current automated test mapping is strongest for stores and helpers, with rendered component tests for most views and real-process integration tests for the PWA build and local dev server.
- RESOLVED (RT-031): Rendered component, integration, generated PWA, and manual coverage requirements are defined per feature in `specs/testing-strategy.md`, with a change gate before broad UI/code changes. Automated end-to-end browser testing is out of scope; real-browser flows use manual checklists.

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
- RESOLVED (RT-030): New or revised specs separate `## Product Contract` (intended behavior; `REQUIRED` / `RESOLVED (RT-xxx)`) from `## Observed Implementation` (current code traceability; `CONFIRMED` / `INFERRED`). See "Spec Convention" below. Current docs satisfy this: the template and all 13 feature specs use both headings. No automated check exists yet.

### Missing Product Flows
- RESOLVED: First-run onboarding follows the RT-023 checklist (storage login, seed accounts, register local credential, review/edit accounts, confirm base currency/config). Implemented: seeding, credential registration, account/config editing, README "First Run" section, and seeding tests exist; there is no base-currency setting by design.
- UNCLEAR: Failed sync and retry recovery after local writes have been accepted.
- CONFIRMED: Multi-device conflict policy is specified; richer conflict review and recovery remain out of scope until product requests a fuller conflict UI.
- RESOLVED: Lost local WebAuthn credential recovery uses the auth dialog Reset local credentials action, then re-registration, keeping provider credentials (RT-020). Implemented in the auth dialog.
- RESOLVED: Missing exchange rates in expense and investment UI summaries require partial totals plus affected currency/account indicators. Current expense and investment code satisfies this with missing-rate metadata and visible indicators; balance recalculation separately warns about missing source data.
- RESOLVED: Dashboard totals must remain split by currency and must never be converted (RT-015). Current dashboard code (`src/views/HomeView.vue`, `src/components/AccountValueCard.vue`) already satisfies this; converted totals are used only in reports that already depend on a global currency. Multi-currency card split coverage is in `src/views/__tests__/HomeView.spec.ts`.
- RESOLVED: Account deletion policy is archive/hide only. Hard deletion is blocked in all cases so historical account ids remain resolvable.
- RESOLVED: Manual balance recalculation is required for authenticated users. Balance snapshots are derived cache, and the app must warn when source data needed for recalculation is missing.
- RESOLVED: Offline contract is app shell plus previously cached data plus queued local edits for supported write flows; fresh remote data requires connectivity (RT-024). Implemented and tested: reconnect handling and offline cache-miss behavior.

- RESOLVED (RT-030): Product Contract versus Observed Implementation convention is documented in "Spec Convention" and `specs/feature-template.md`. Current docs satisfy it; automated heading check is optional and not implemented.

### Cross-Spec Contradictions / Tensions
- CONFIRMED: No direct route-access contradiction was found; `/` and `/expenses` are consistently described as unprotected, while `/balance`, `/investments`, `/settings/general`, and `/settings/accounts` require authentication.
- CONFIRMED: No direct data-file naming contradiction was found across product overview, data model, and feature specs.
- RESOLVED: PWA offline-ready assets and storage sync are reconciled by the RT-024 offline promise; fresh remote JSON data is not guaranteed offline.
- RESOLVED: Account ids are durable references across historical files; archive/hide replaces hard deletion.
- RESOLVED: Transaction edits intentionally continue to use delete-plus-new-id; stable audit identity across edits is out of scope unless a future audit/reconciliation feature changes the model.
- RESOLVED (RT-029): Google Drive is out of scope until a provider helper, auth flow, and sync tests exist; no spec may treat it as an implemented provider. Current code satisfies this (option is unavailable and unselectable); covered by `src/helpers/__tests__/storageIndex.spec.ts`. See `features/storage-sync.md`.

## Highest-Priority Product Owner Questions
- RESOLVED: Conflict resolution uses transaction merge-by-id for queued transaction rows and last writer wins with a visible warning for whole-file conflicts.
- RESOLVED: Account lifecycle uses archive/hide as the normal path; hard deletion is blocked in all cases.
- RESOLVED: Failed sync follows RT-002; provider login, WebAuthn, and Dropbox token refresh follow RT-020 (shared auth error state with retry, reset local credentials, and provider-login restart; implemented and tested). External value providers remain UNCLEAR.
- RESOLVED: First-run onboarding is the RT-023 checklist documented in `specs/features/authentication.md`, with no dedicated onboarding UI; implemented and tested.
- RESOLVED: Offline promise is app shell, previously cached data, and queued local edits for supported write flows; not full offline workflows (RT-024).
- RESOLVED: Balance snapshots are rebuildable cache and require an authenticated force-recalculate action with missing-source warnings. Current code satisfies this with store and rendered view coverage.
- RESOLVED: Transaction edits continue using delete-plus-new-id. Current code satisfies this behavior; add dialog-level coverage to lock it down.

## Recommended Next Specs To Write
- CONFIRMED: `specs/features/transaction-dialogs.md` for transaction type-specific dialog components and expected flow, if those components are still intended to be active.
- CONFIRMED: `specs/features/selectors-and-shared-components.md` for account selector, period selector, comments dialog, and account value cards.
- CONFIRMED: `specs/validation-and-errors.md` consolidating visible validation rules and user-facing error expectations.
- CONFIRMED: `specs/compatibility.md` defining the versionless JSON compatibility policy, additive default requirements, ignored deprecated structures, prohibited renames, legacy account type handling, and account deletion/reference policy.
- CONFIRMED: `specs/sync-conflicts.md` defining conflict resolution for multi-device edits.
- CONFIRMED: `specs/security.md` defining local credential, provider token, and PWA cache security expectations.
- RESOLVED (RT-031): `specs/testing-strategy.md` now exists and defines rendered component, integration, service-worker, and manual coverage.
