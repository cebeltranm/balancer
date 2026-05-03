# Feature: Storage Sync

## Goal
- CONFIRMED: Keep local IndexedDB changes and remote JSON storage synchronized across supported providers.

## Current Implemented Behavior
- CONFIRMED: Storage provider selection is handled by `src/helpers/storage/index.ts`.
- CONFIRMED: Provider options include Dropbox, planned Google Drive, and local HTTP server only on `localhost:3000`.
- CONFIRMED: `useStorageStore()` tracks `storeInfo`, selected provider, pending transactions/files, and status flags `inSync`, `offline`, `loggedIn`, `authenticated`.
- CONFIRMED: `readJsonFile()` caches remote reads with `to_sync: false`; `writeJsonFile()` uploads and caches successful writes.
- CONFIRMED: Pending transaction changes are stored in IndexedDB `transactions`; pending JSON file changes are stored in IndexedDB `files` with `to_sync: true`.
- CONFIRMED: Sync merges pending transactions by year/month, stages monthly transaction files, removes transaction queue entries, recalculates affected balances, and then uploads files marked `to_sync`.
- CONFIRMED: Startup compares remote file modification timestamps with cached timestamps and reloads stale cached files by file prefix.

## User Flows
- CONFIRMED: App starts and refreshes store info.
- CONFIRMED: User edits transactions/values/budget/balance-generating data; pending counters update.
- CONFIRMED: If online, pending changes trigger debounced sync.
- CONFIRMED: User can retry storage login or logout/clear local data.

## Inputs And Outputs
- CONFIRMED: Inputs are selected provider, provider credentials, IndexedDB queues, cached files, remote file list, and storage online status.
- CONFIRMED: Outputs are updated remote JSON files, refreshed local store state, pending counters, and status flags.

## Data Files Read/Written
- CONFIRMED: Can read/write all app JSON files: `accounts.json`, `config.json`, `transactions_<year>_<month>.json`, `values_<year>.json`, `budget_<year>.json`, `balance_<year>.json`.
- CONFIRMED: Also reads/writes IndexedDB stores `transactions` and `files`.

## Store / Helper / Component Files Involved
- CONFIRMED: `src/stores/storage.ts`, `src/helpers/files.ts`, `src/helpers/idb.ts`, `src/helpers/sync.ts`, `src/helpers/storage/index.ts`, `src/helpers/storage/dropbox.ts`, `src/helpers/storage/http_server.ts`, `src/components/Auth.vue`, `src/views/Settings.vue`.

## Error Handling
- CONFIRMED: Dropbox read ignores 404-410 missing-file errors but rethrows other unexpected errors.
- CONFIRMED: HTTP server helper removes token on 401.
- CONFIRMED: `writeJsonFile()` catches errors, logs them, and returns false.
- CONFIRMED: `executeInSync()` clears `inSync` in `finally`.
- UNCLEAR: Sync upload failures do not appear to clear `to_sync`, but user-facing failure reporting is minimal.

## Edge Cases
- CONFIRMED: Stored local HTTP provider selection is ignored outside `localhost:3000`.
- CONFIRMED: Google Drive is listed as planned/unavailable and cannot be selected.
- CONFIRMED: Dropbox expired access tokens can refresh from a refresh token.
- INFERRED: Whole-file sync can overwrite remote changes when cached file writes race with another device.

## Acceptance Criteria
- CONFIRMED: GIVEN queued IndexedDB transactions or files exist, WHEN pending counters are updated, THEN `pendingTransactions` and `pendingFiles` match the queue sizes.
- CONFIRMED: GIVEN `status.offline` is true, WHEN pending counters become non-zero, THEN automatic sync does not start.
- CONFIRMED: GIVEN one explicit sync operation is running, WHEN another explicit sync operation is requested, THEN the later operation waits until the current operation finishes.
- CONFIRMED: GIVEN pending transaction changes exist, WHEN sync succeeds, THEN affected monthly transaction files are staged, transaction queue entries are removed, and balance recalculation starts from the earliest changed month.
- CONFIRMED: GIVEN logout succeeds, WHEN state reset completes, THEN provider credentials, IndexedDB, store info, pending counters, and authentication flags are cleared.
- UNCLEAR: The intended conflict policy for concurrent multi-device edits is not specified.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/storage.spec.ts` covers pending counters, serialized sync, info refresh, provider selection effects, and logout.
- CONFIRMED: `src/helpers/__tests__/files.spec.ts` covers cache read, remote read cache, and write-through cache.
- CONFIRMED: `src/helpers/__tests__/idb.spec.ts` covers IndexedDB wrapper operations.
- CONFIRMED: `src/helpers/__tests__/sync.spec.ts` covers transaction sync and file sync.
- CONFIRMED: `src/helpers/__tests__/storageIndex.spec.ts` and `httpServer.spec.ts` cover provider selection and local HTTP helper behavior.

## Missing Tests / Coverage Gaps
- CONFIRMED: No Dropbox helper tests.
- CONFIRMED: No integration tests across Auth startup refresh, sync, balance recalculation, and store reloads.
- CONFIRMED: No conflict-resolution tests for concurrent edits.

## Product Questions
- UNCLEAR: Should file conflicts use last-write-wins, merge with warnings, or block sync until user review?
- UNCLEAR: What user-visible state should remain after a sync upload fails?
