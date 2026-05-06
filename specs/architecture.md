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
- INFERRED: Conflict resolution is last-write/merge-by-id for transactions and overwrite for whole JSON files; no revision-based conflict handling is visible.
- UNCLEAR: The intended behavior when two devices edit the same cached file before syncing is not specified.

## PWA Behavior
- CONFIRMED: `vite-plugin-pwa` is configured in `vite.config.ts` with `registerType: "autoUpdate"`, app manifest metadata, icons, dev service-worker support, outdated-cache cleanup, and Workbox glob patterns for JS/CSS/HTML/WOFF.
- CONFIRMED: `src/helpers/pwa.ts` registers the service worker immediately via `useRegisterSW()`.
- CONFIRMED: The build-time replacement sets `__RELOAD_SW__` to `"true"`, causing registered service workers to check for updates every 120 seconds.
- CONFIRMED: `src/App.vue` shows a persistent toast when `needRefresh` becomes true and calls `updateServiceWorker(true)` when the user chooses update.
- UNCLEAR: Runtime service-worker behavior after VitePWA generation is only partially represented by source files; generated output is not part of these specs.

## Authentication Boundaries
- CONFIRMED: Storage-provider login is separate from local device authentication.
- CONFIRMED: Dropbox OAuth tokens are stored in browser storage keys `dbx_token`, `dbx__refresh_token`, and `__codeVerifier`.
- CONFIRMED: The local HTTP server stores a bearer token in `http_server_token`.
- CONFIRMED: Local device authentication stores WebAuthn credential metadata in `localStorage` key `crlocal`; successful `navigator.credentials.get()` sets `storageStore.status.authenticated = true`.
- CONFIRMED: The HTTP server provider auto-authenticates the app after login without WebAuthn.
- INFERRED: WebAuthn is a local UI gate, not encryption for JSON files or provider credentials.

## Main Risks And Assumptions
- CONFIRMED: `syncCachedFiles()` in `Auth.vue` uses `Object.keys(...).forEach(async ...)`, so refresh tasks are launched without being awaited as a group.
- CONFIRMED: `accounts.json` in `public/` includes legacy-looking account type strings (`cash`, `SavingAccount`) that do not match `AccountType` enum values.
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
- UNCLEAR: The architecture does not specify a conflict-resolution boundary for multi-device edits.

## Cross-Spec Consistency Notes
- CONFIRMED: `product-overview.md`, `architecture.md`, and `storage-sync.md` consistently describe Dropbox as the normal provider and the local HTTP provider as development-only.
- CONFIRMED: `authentication.md`, `dashboard.md`, `expenses.md`, `balance.md`, and `investments.md` consistently state that `/` and `/expenses` remain accessible without router authentication checks, while sensitive routes require authentication.
- INFERRED: `data-model.md`, `accounts.md`, and `investments.md` all depend on account ids and investment metadata remaining stable, but none defines a full migration/reference policy.
- UNCLEAR: `pwa.md` promises offline-ready app assets, while `storage-sync.md` makes clear remote JSON data still depends on IndexedDB/provider state; the exact offline product promise is not defined.
