# Testing Strategy

Resolves RT-031. This document defines the component, integration, and manual coverage each feature needs before broad UI or code changes, so that specs are not considered testable while key user flows remain unverified.

It is the source of truth for **required coverage levels**. Each feature spec's `## Missing Tests / Coverage Gaps` section remains the source of truth for **specific open gaps**, and must agree with the matrix below.

## Test Layers

| Layer | What it proves | Environment | Location | Run by |
| --- | --- | --- | --- | --- |
| Unit | Store actions, helpers, composables, and persisted-shape rules in isolation. | Vitest, `node` (default, see `vite.config.ts`). | `src/stores/__tests__/`, `src/helpers/__tests__/`, `src/composables/__tests__/` | `npm run test` |
| Component | A mounted view or component renders the Product Contract: visible state, gating, validation, toasts/messages, and the store calls made by user actions. | Vitest with `// @vitest-environment jsdom` at the top of the file. | `src/views/__tests__/`, `src/components/__tests__/`, `src/layout/__tests__/`, `src/__tests__/` | `npm run test` |
| Integration | Real collaboration across a process, build, or module boundary: a real Vite build, a real `server/index.js` process, the real router, or several real stores/helpers together. | Vitest (`node` or `jsdom`). | Next to the closest unit suite, e.g. `src/helpers/__tests__/pwaBuild.spec.ts`, `src/helpers/__tests__/localDevServer.spec.ts`, `src/router/__tests__/guard.spec.ts` | `npm run test` |
| Manual | Behavior jsdom cannot exercise: real browser APIs (WebAuthn, service worker), real provider OAuth, real chart rendering, real PrimeVue overlay interaction, real devices. | A browser against `npm run dev`, `npm run preview`, or `npm run https-preview`. | Checklists in this document. | A person, before release of a change touching the feature. |
| End-to-end | Full browser flows driven automatically. | — | — | Out of scope. |

- RESOLVED (RT-031): Automated end-to-end browser testing (Playwright, Cypress, or similar) is out of scope for now. No end-to-end tool is installed and none may be added without a product decision, per the dependency policy in `AGENTS.md`. Flows that need a real browser are covered by the Manual checklists below.
- RESOLVED (RT-031): Component tests use the existing in-repo pattern rather than adding `@vue/test-utils`: `createApp(Component, props)`, PrimeVue components replaced with lightweight stubs registered via `app.component(...)`, stores and composables mocked with `vi.mock`/`vi.hoisted`, and assertions made against the jsdom DOM. See `src/views/__tests__/HomeView.spec.ts` and `src/components/__tests__/TransactionEditDialog.spec.ts`.

## Conventions

- REQUIRED: Each rendered test file starts with `// @vitest-environment jsdom`. Node-only suites keep the default `node` environment and the mock `window` from `src/test/setup.ts`.
- REQUIRED: Test names describe the observable Product Contract behavior, and cite the RT id in the `describe` or `it` name when the test exists to lock a triage decision, e.g. `describe("Expenses income visibility (RT-016)", ...)`.
- REQUIRED: Component tests assert what the user sees (text, enabled/disabled controls, presence of warnings) and the store/helper calls caused by user actions. They do not assert internal refs, computed values, or CSS classes unless the class is the contract (e.g. a pending-row indicator).
- REQUIRED: Store/composable mocks used by a component test must honor the arguments that drive the branch under test. A mock that ignores its arguments does not count as coverage for that branch (see the RT-016 note in `specs/features/expenses.md`).
- REQUIRED: Tests must not hit real network services or real provider accounts. `fetch`, Dropbox SDK calls, WebAuthn, and IndexedDB are mocked; the only real servers allowed are child processes started by the test itself (`localDevServer.spec.ts`) and the real Vite build (`pwaBuild.spec.ts`).
- REQUIRED: Manual checklist results for a release are recorded in the PR description of the change that triggered them, listing each checklist item as pass/fail/not applicable.

## Change Gate

- REQUIRED (RT-031): Before a broad UI or code change to a feature (more than a small, local fix), every **REQUIRED Component** and **REQUIRED Integration** row for that feature in the matrix below must have a covering test, or the test must be added in the same PR before the behavior change.
- REQUIRED (RT-031): A PR that changes a feature with a Manual checklist must run the checklist items that the change could affect and record results per Conventions.
- REQUIRED (RT-031): When a gap is closed, update both this matrix and the feature spec's `## Missing Tests / Coverage Gaps` in the same PR.
- RECOMMENDED: Small, local fixes may proceed without closing unrelated gaps, but must add a test for the behavior they change.

## Per-Feature Coverage Matrix

Status markers: `COVERED` (a test exists and is cited), `GAP` (required, no test yet), `PENDING` (blocked on an open product decision). Manual items are verified by the checklists below.

### Dashboard (`specs/features/dashboard.md`)
- Component — REQUIRED:
  - COVERED: Empty state vs. current balance cards (`src/views/__tests__/HomeView.spec.ts`).
  - COVERED (RT-015): Per-currency card split, same-currency summing, and independence from the global `CURRENCY` (`HomeView.spec.ts`).
  - GAP: Authenticated vs. unauthenticated account-group visibility (`HomeView.vue` shows extra groups when `storageStore.status.authenticated`).
- Integration: none required.
- Manual: card layout on desktop and mobile widths.

### Transactions (`specs/features/transactions.md`)
- Component — REQUIRED:
  - COVERED: Edit as delete-original-plus-new-id, and local queue failure keeps the dialog from reporting success (`src/components/__tests__/TransactionEditDialog.spec.ts`).
  - GAP: `TransactionEditDialog.vue` validation blocks saving invalid input (missing description, unbalanced or empty values).
  - GAP: `Transactions.vue` lists the loaded month's transactions and opens the edit dialog for create and edit.
- Integration — RECOMMENDED: edit-as-delete-plus-new-save followed by balance recalculation across the real transactions and balance stores.
- Manual: date picker and autocomplete interaction in a real browser.

### Expenses (`specs/features/expenses.md`)
- Component — REQUIRED:
  - COVERED (RT-011): Partial totals with a missing-rate indicator, and explicit zero rates not flagged (`src/views/__tests__/ExpensesMissingRates.spec.ts`).
  - COVERED (RT-016): Income hidden when unauthenticated and shown when authenticated (`src/views/__tests__/ExpensesIncomeVisibility.spec.ts`).
  - GAP: Budget progress rendering and comment dialog behavior.
- Integration: none required.
- Manual: treemap and bar charts render (Google Charts / Chart.js) on desktop and mobile.

### Accounts (`specs/features/accounts.md`)
- Component — REQUIRED:
  - COVERED: Global geographic exposure column and Global weights kept on save (`src/views/__tests__/AccountsClassAllocation.spec.ts`).
  - GAP (RT-017): An investment account whose class allocation does not sum to 100% cannot be saved.
  - GAP (RT-003): The edit dialog exposes hide/restore and no hard-delete action.
- Unit — COVERED: hide/archive persists `hideSince`; hard delete is blocked (`src/stores/__tests__/accounts.spec.ts`).
- Integration: none required.
- Manual: none beyond general UI review.

### Values (`specs/features/values.md`)
- Component — REQUIRED:
  - COVERED: External provider failures show one generic error; prior-month fallback shows no warning; MXN sync and save (`src/views/__tests__/Values.spec.ts`).
  - GAP: Saving values triggers balance recalculation.
  - GAP: Manual editing and pending-row indication.
- Unit — COVERED: default and USD cross-rate fallback windows (`src/stores/__tests__/values.spec.ts`).
- Manual: real external rate/stock providers respond and are parsed (requires network; never automated).

### Budget (`specs/features/budget.md`)
- Component — REQUIRED:
  - GAP: Editing a budget cell and saving calls `setBudgetForYear()`.
  - GAP: A failed local budget queue write shows an error and is not presented as saved.
- Unit — COVERED: load, group, save, and failed queue write (`src/stores/__tests__/budget.spec.ts`).
- Manual: context menu and comments dialog interaction.

### Balance (`specs/features/balance.md`)
- Component — REQUIRED:
  - COVERED (RT-010): Force-recalculate action shown only when authenticated, and missing-source warnings rendered (`src/views/__tests__/Balance.spec.ts`).
- Unit — COVERED: grouping, current-month recalculation, offline cache, warnings (`src/stores/__tests__/balance.spec.ts`).
- Unit — RECOMMENDED: recalculation formulas across all account types; multi-month recursive recalculation.
- Manual: none beyond general UI review.

### Investments (`specs/features/investments.md`)
- Component — REQUIRED:
  - COVERED (RT-017): Legacy account with no class allocation grouped under Unknown with a visible warning (`src/views/__tests__/PortfolioUnknownAllocation.spec.ts`, ByAssetClass).
  - GAP (RT-017): ByRegion Unknown grouping, and a fully allocated account never produces an Unknown bucket.
  - GAP: Table and bar child views render missing-rate indicators.
- Unit — COVERED: investment mapping and grouping (`src/helpers/__tests__/investments.spec.ts`); missing-rate totals (`src/composables/__tests__/totalByCategory.spec.ts`).
- Manual: pie, treemap, and bar charts render correctly.

### Settings (`specs/features/settings.md`)
- Component — REQUIRED:
  - COVERED (RT-018): Retry login toasts and unchanged state on failure (`src/views/__tests__/Settings.spec.ts`).
  - COVERED (RT-019): Composition save compaction and round trip (`src/views/__tests__/SettingsComposition.spec.ts`).
  - GAP: Clearing local credentials shows its toast.
- Manual: none beyond general UI review.

### Storage Sync (`specs/features/storage-sync.md`)
- Unit — COVERED: file cache, IndexedDB, merge-by-id, whole-file conflict warning, failed upload keeps queue, sync-failed state and retry, provider selection including Google Drive fallback (RT-029), HTTP client, Dropbox helper (`files.spec.ts`, `idb.spec.ts`, `sync.spec.ts`, `storage.spec.ts`, `storageIndex.spec.ts`, `httpServer.spec.ts`, `dropbox.spec.ts`).
- Component — REQUIRED:
  - COVERED: Offline indicator (`src/layout/__tests__/AppTopbar.spec.ts`).
  - GAP (RT-002): Sync status button label/icon in the sync-failed state remains the retry action.
- Integration — RECOMMENDED: Auth startup refresh → sync → balance recalculation → store reloads.
- Manual: Dropbox sync between two devices, including a whole-file conflict warning.

### Authentication (`specs/features/authentication.md`)
- Component — REQUIRED:
  - COVERED (RT-020, RT-021, RT-023): `src/components/__tests__/Auth.spec.ts`.
- Integration — REQUIRED:
  - COVERED (RT-021): Real router guard emits auth checks only for sensitive routes (`src/router/__tests__/guard.spec.ts`).
- Unit — COVERED: Dropbox token refresh and rejected codes (`dropbox.spec.ts`); auth error state (`storage.spec.ts`).
- Manual — REQUIRED: real WebAuthn register/authenticate; Dropbox OAuth redirect round trip; reset local credentials then re-register.

### Local Dev Server (`specs/features/local-dev-server.md`)
- Integration — REQUIRED:
  - COVERED (RT-027): Real `server/index.js` child process creates `.tmp/`, serves `/list`, writes files, rejects unauthorized requests (`src/helpers/__tests__/localDevServer.spec.ts`).
  - PENDING (RT-028): Path traversal outside `.tmp/` — required once RT-028 is decided; the current server does not reject it, so no test can assert rejection yet.
  - RECOMMENDED: `/list` and write filesystem failures return errors; `.tmp/` creation failure returns 500.
- Unit — COVERED: HTTP storage client (`httpServer.spec.ts`).

### PWA (`specs/features/pwa.md`)
- Unit — COVERED: registration and console-only failure (`src/helpers/__tests__/pwa.spec.ts`).
- Component — COVERED (RT-026): Update toast behavior (`src/__tests__/App.spec.ts`).
- Integration — COVERED (RT-025): Real Vite build manifest, precache, and outdated-cache cleanup (`src/helpers/__tests__/pwaBuild.spec.ts`).
- Manual — REQUIRED: install, offline reload with cached data, update prompt "Update now" and close in a real browser.

## Manual Checklists

Run against `npm run build` + `npm run https-preview` unless noted. Record results per Conventions.

### Authentication
- [ ] First run on a clean browser profile: storage login, accounts seeded, Register Credentials offered.
- [ ] WebAuthn registration succeeds and a reload requires WebAuthn authentication.
- [ ] Cancelling WebAuthn shows the auth error with Retry, Reset local credentials, and Restart provider login.
- [ ] Reset local credentials keeps provider login and allows re-registration.
- [ ] Dropbox OAuth redirect round trip returns to the app logged in (non-localhost host).

### PWA and Offline
- [ ] App installs from the browser prompt.
- [ ] Going offline after a visit: app shell loads, previously cached data is shown, offline indicator is visible.
- [ ] A supported write made offline stays queued and syncs after reconnecting.
- [ ] Deploying a new build shows the update toast; closing it does not update; "Update now" reloads into the new version.

### Storage Sync
- [ ] Two devices editing the same whole file: the later writer wins and a visible conflict warning appears.
- [ ] A failed sync shows the persistent sync-failed state and the sync button retries.

### Charts and Overlays
- [ ] Expenses treemap and bar charts render with data on desktop and mobile widths.
- [ ] Portfolio pie, treemap, and bar charts render; Unknown allocation warning visible when applicable.
- [ ] Budget context menu and comments dialog open, save, and close.
- [ ] Transaction dialog date picker and tag autocomplete work.

### External Providers
- [ ] Values external sync fetches currency and stock values from the real providers and saves them.

## Priority For Closing Gaps

1. Budget component coverage (editing/save and failed-save UX) — no rendered coverage exists.
2. Transactions component coverage (dialog validation, view list/open dialog).
3. Accounts component coverage (allocation-sum validation RT-017, hide/no hard delete RT-003).
4. Remaining component gaps: Values save → balance recalculation, Dashboard auth visibility, Investments ByRegion and child views, Settings credential toast, sync-failed button.
5. Local dev server path traversal integration test, once RT-028 is decided.
6. RECOMMENDED integration flows (transactions → balance, auth startup → sync → reload).
