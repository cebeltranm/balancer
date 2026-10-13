# Architecture Spec

## App Architecture
- CONFIRMED: Balancer is a Vue 3 SPA bootstrapped from `src/main.ts`, with Pinia stores, Vue Router, PrimeVue, Google Charts, and a global `$format` formatter.
- CONFIRMED: `src/App.vue` owns the app shell, navigation menu, logout confirmation, global toast handling, PWA update toast, and authentication dialog.
- CONFIRMED: Routes are declared in `src/router/index.ts`; major pages live in `src/views/`, reusable dialogs/selectors live in `src/components/`, state lives in `src/stores/`, and storage/domain helpers live in `src/helpers/`.
- CONFIRMED: The router emits `CHECK_AUTHENTICATE` for every route except `/` and `/expenses`, and blocks navigation when `FORM_WITH_PENDING_EVENTS` says a form has pending changes.
- INFERRED: Stores are the main domain boundary: views mostly derive tables/charts from store state and call store actions for persistence.

## Storage Architecture
- CONFIRMED: Durable user data is stored as JSON files through a selected storage provider. Dropbox is the default provider outside local development; `http://localhost:8181` is available on `localhost:3000`.
- CONFIRMED: `src/helpers/files.ts` reads JSON from IndexedDB cache first when cache is enabled, otherwise from the selected provider, then caches remote reads in IndexedDB.
- CONFIRMED: Direct writes through `writeJsonFile()` upload to the provider and cache the successful write with `to_sync: false`.
- CONFIRMED: Store writes for transactions, values, budget, and balance are usually staged into IndexedDB with `to_sync: true`; accounts and config write directly through `writeJsonFile()`.
- CONFIRMED: IndexedDB database name is `balancer`, version `1`, with object stores `transactions` and `files`, both keyed by `id`.
- CONFIRMED: Domain JSON files are versionless. Compatibility is maintained by preserving existing file names and top-level structures, defaulting additive structures when absent, and ignoring removed or deprecated structures when present.
- CONFIRMED: Store loaders satisfy the versionless compatibility policy through shared normalizers in `src/helpers/persistedShapes.ts`, with helper tests and persisted-family store tests covering defaults and ignored deprecated structures.

## Offline / Cache / Sync Architecture
- CONFIRMED: Pending transactions are stored in the IndexedDB `transactions` store and merged into monthly `transactions_<year>_<month>.json` files by `syncTransactions()`.
- CONFIRMED: Cached files marked `to_sync` are uploaded by `syncFiles()`.
- CONFIRMED: `useStorageStore().updatePendingToSync()` counts queued transactions and files; when counts become non-zero it starts sync if not offline.
- CONFIRMED: `useStorageStore().executeInSync()` serializes explicit sync-like operations so a later operation waits for the current one to finish.
- CONFIRMED: After transaction sync, storage sync reloads affected transaction months and recalculates balance from the earliest changed month.
- CONFIRMED: Conflict resolution uses merge-by-id for queued transaction rows and last writer wins with a visible warning for whole-file conflicts.
- CONFIRMED: Current code implements transaction merge-by-id, detects whole-file conflicts from remote modification time, uploads the local cached file as the winning version, and emits the required warning.

## PWA Behavior
- CONFIRMED: `vite-plugin-pwa` is configured in `vite.config.ts` with `registerType: "autoUpdate"`, app manifest metadata, icons, dev service-worker support, outdated-cache cleanup, and Workbox glob patterns for JS/CSS/HTML/WOFF.
- CONFIRMED: `src/helpers/pwa.ts` registers the service worker immediately via `useRegisterSW()`.
- CONFIRMED: The build-time replacement sets `__RELOAD_SW__` to `"true"`, causing registered service workers to check for updates every 120 seconds.
- CONFIRMED: `src/App.vue` shows a persistent toast when `needRefresh` becomes true and calls `updateServiceWorker(true)` when the user chooses update.
- RESOLVED (RT-025, RT-037): The generated service worker is specified by its observable result, not its source. A production build must emit a manifest named `Balancer` with the 192/512 icons, a service worker that precaches `index.html` and the built JS/CSS assets, and outdated-cache cleanup; this is covered by `src/helpers/__tests__/pwaBuild.spec.ts`. Registration failure is console-only and never blocks startup (`pwa.spec.ts`). In-browser install, activate, offline reload, and update-swap behavior is manual coverage per `specs/testing-strategy.md`. See `specs/features/pwa.md`.
- RESOLVED (RT-039): `src/claims-sw.ts`, `src/prompt-sw.ts`, `src/worker.js`, and `src/workerImport.js` are unused and out of scope. Nothing imports them and the `injectManifest` config that would use them is commented out in `vite.config.ts`. The generated VitePWA service worker is the only service-worker contract. They are to be removed in a separate cleanup task.

## Authentication Boundaries
- CONFIRMED: Storage-provider login is separate from local device authentication.
- CONFIRMED: Dropbox OAuth tokens are stored in browser storage keys `dbx_token`, `dbx__refresh_token`, and `__codeVerifier`.
- CONFIRMED: The local HTTP server stores a bearer token in `http_server_token`.
- CONFIRMED: Local device authentication stores WebAuthn credential metadata in `localStorage` key `crlocal`; successful `navigator.credentials.get()` sets `storageStore.status.authenticated = true`.
- CONFIRMED: The HTTP server provider auto-authenticates the app after login without WebAuthn.
- INFERRED: WebAuthn is a local UI gate, not encryption for JSON files or provider credentials.

## List Ordering
- RESOLVED (RT-040, RT-041): Screens that sort a list for display use `localeCompare` with `{ sensitivity: "base", numeric: true }` (case and accents ignored, digit runs numeric: "Fund 2" before "Fund 10"), and break ties by account id so the order is stable.
- RESOLVED (RT-041): Empty names sort after non-empty names, then by id.
- RESOLVED (RT-040, RT-041): Ordering is applied in the view and is display-only. It never changes `accounts.json`, `activeAccounts()`, `accountsGroupByCategories()` or other store getters, persisted files, totals, or sync.
- RESOLVED (RT-040, RT-041): Feature specs name the lists they order and reference this section: `features/values.md` (RT-040) and `features/investments.md` (RT-041, table display only).

## Main Risks And Assumptions
- CONFIRMED: `syncCachedFiles()` in `Auth.vue` uses `Object.keys(...).forEach(async ...)`, so refresh tasks are launched without being awaited as a group.
- RESOLVED (RT-034): Files seeded before RT-006 may contain legacy account type strings (`cash`, `SavingAccount`) that do not match `AccountType` enum values. They are migrated in memory on load by a fixed alias list; see `features/accounts.md`.
- CONFIRMED: `balance_<year>.json` is calculated and persisted; stale balances are possible if source files change without recalculation.
- INFERRED: The app assumes account ids are stable because transactions, budget, values, and balance files reference account ids.
- INFERRED: The app assumes monthly transaction ids are unique enough to merge by `id`; new transaction ids are generated with `Date.now()`.
- CONFIRMED: There is intentionally no schema version or migration envelope for domain JSON files; renaming existing files or replacing existing top-level structures is prohibited.

## Architecture Acceptance Criteria
- CONFIRMED: GIVEN the app starts, WHEN `src/main.ts` runs, THEN Vue Router, Pinia, PrimeVue, Google Charts, and the global formatter are installed before mounting.
- CONFIRMED: GIVEN navigation targets a protected route while unauthenticated, WHEN the router emits `CHECK_AUTHENTICATE`, THEN `App.vue` can open the authentication dialog.
- CONFIRMED: GIVEN forms report pending changes, WHEN navigation is attempted, THEN router navigation is blocked by the pending-change guard.
- CONFIRMED: GIVEN cached file writes are marked `to_sync`, WHEN storage sync runs online, THEN cached files are uploaded through the selected provider and successful uploads clear pending state.
- CONFIRMED: GIVEN a future storage change is proposed, WHEN it affects an existing persisted JSON file, THEN it must preserve the existing file name and top-level structure, provide defaults for any additive structures, and ignore removed structures.
- CONFIRMED: GIVEN concurrent edits affect queued transaction rows, WHEN sync stages the affected monthly transaction file, THEN transaction rows are merged by id.
- CONFIRMED: GIVEN concurrent edits affect a whole JSON file, WHEN the local cached file is uploaded after a newer remote write, THEN the local file wins and the app shows a visible conflict warning.

- RESOLVED (RT-041): GIVEN a list is ordered for display, WHEN it is rendered, THEN the order follows List Ordering and the underlying stores, files, and totals are unchanged.

## Cross-Spec Consistency Notes
- CONFIRMED: `product-overview.md`, `architecture.md`, and `storage-sync.md` consistently describe Dropbox as the normal provider and the local HTTP provider as development-only.
- CONFIRMED: `authentication.md`, `dashboard.md`, `expenses.md`, `balance.md`, and `investments.md` consistently state that `/` and `/expenses` remain accessible without router authentication checks, while sensitive routes require authentication.
- INFERRED: `data-model.md`, `accounts.md`, and `investments.md` all depend on account ids and investment metadata remaining stable, but none defines a full migration/reference policy.
- RESOLVED: `pwa.md` offline-ready assets and `storage-sync.md` IndexedDB/provider dependence are reconciled by the RT-024 promise: app shell, previously cached data, and queued local edits; fresh remote data requires connectivity.
