# Feature: Storage Sync

## Goal
- CONFIRMED: Keep local IndexedDB changes and remote JSON storage synchronized across supported providers.

## Observed Implementation
- CONFIRMED: Storage provider selection is handled by `src/helpers/storage/index.ts`.
- CONFIRMED: Provider options include Dropbox, a non-selectable Google Drive entry (out of scope, RT-029), and local HTTP server only on `localhost:3000`.
- CONFIRMED: `useStorageStore()` tracks `storeInfo`, selected provider, pending transactions/files, and status flags `inSync`, `offline`, `loggedIn`, `authenticated`.
- CONFIRMED: `readJsonFile()` caches remote reads with `to_sync: false`; `writeJsonFile()` uploads and caches successful writes.
- CONFIRMED: Pending transaction changes are stored in IndexedDB `transactions`; pending JSON file changes are stored in IndexedDB `files` with `to_sync: true`.
- CONFIRMED: Sync merges pending transactions by year/month, stages monthly transaction files, removes transaction queue entries, recalculates affected balances, and then uploads files marked `to_sync`.
- CONFIRMED: Startup compares remote file modification timestamps with cached timestamps and reloads stale cached files by file prefix.
- CONFIRMED: Code satisfies the RT-001 conflict policy: queued transaction rows merge by `id`, and whole-file conflicts use last writer wins with a visible warning.
- CONFIRMED: Code satisfies RT-002 by keeping pending items queued after sync failure, setting shared sync-failed state, showing a persistent sync-failed toast, and keeping retry available from sync status.
- CONFIRMED: Contract status: satisfied for RT-001, RT-002, and RT-029; Google Drive test coverage is still missing (see Missing Tests).

## Product Contract
- REQUIRED (RT-001): Transaction queue conflicts merge by id; whole-file conflicts use last writer wins with a visible warning.
- REQUIRED (RT-002): Sync failures keep pending items queued, show a persistent sync-failed status/toast, and offer retry from sync status.
- REQUIRED (RT-029): Google Drive is out of scope until a provider helper, auth flow, and sync tests exist.

## User Flows
- CONFIRMED: App starts and refreshes store info.
- CONFIRMED: User edits transactions/values/budget/balance-generating data; pending counters update.
- CONFIRMED: If online, pending changes trigger debounced sync.
- REQUIRED: If sync fails, the user sees a persistent sync-failed status/toast and can retry from sync status without leaving the current workflow.
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
- REQUIRED: Sync upload failures must keep pending items queued instead of marking them as remotely saved.
- REQUIRED: Sync failures must set a shared sync-failed state that remains visible until a later successful sync, logout/reset, or another explicit clearing action.
- REQUIRED: Sync failures must show a persistent user-visible sync-failed toast or status. The message must indicate that changes are still queued locally and that retry is available from sync status.
- REQUIRED: Sync status must provide an explicit retry action that attempts the queued sync again.

## Edge Cases
- CONFIRMED: Stored local HTTP provider selection is ignored outside `localhost:3000`.
- RESOLVED (RT-029): Google Drive is out of scope. It is listed as unavailable (`available: false`, `planned: true`) and cannot be selected. It must not be treated as a supported provider until a Google Drive provider helper, an auth flow, and sync tests exist; adding those is a new product decision, not an implicit extension of this spec.
- CONFIRMED: Dropbox expired access tokens can refresh from a refresh token.
- CONFIRMED: Whole-file conflicts use last writer wins with a visible warning: if a cached `to_sync` file is uploaded after the remote file changed elsewhere, the local cached version still wins, and the user must be warned that the remote file was overwritten.
- CONFIRMED: Queued transaction rows continue to use merge-by-id conflict handling until a richer conflict UI exists.

## Acceptance Criteria
- CONFIRMED (RT-024): GIVEN queued transactions are staged by `syncTransactions()` (merged with the freshly read remote month), WHEN `syncFiles()` uploads the staged file, THEN no "Sync conflict" warning is shown (`skip_conflict_check: true`). Other whole-file edits keep the RT-001 warning.
- CONFIRMED (RT-024): GIVEN the app is offline, WHEN balance is recalculated, THEN `balance_<year>.json` is only cached (`to_sync: false`, not queued); after reconnect, sync recalculates from the earliest changed month and uploads it (`to_sync: true`, `skip_conflict_check: true`) without a conflict warning.
- CONFIRMED (RT-024): `HttpServer.getLastModification` returns the file's real modified time from `/list` (undefined if missing) instead of the current time, so local dev no longer reports every file as a conflict.
- CONFIRMED: GIVEN queued IndexedDB transactions or files exist, WHEN pending counters are updated, THEN `pendingTransactions` and `pendingFiles` match the queue sizes.
- CONFIRMED: GIVEN `status.offline` is true, WHEN pending counters become non-zero, THEN automatic sync does not start.
- RESOLVED (RT-024): Offline promise is app shell, previously cached data, and queued local edits for supported write flows; fresh remote data requires connectivity. See `pwa.md` for criteria and gaps. Implemented: the storage store listens for browser `online`/`offline` events, refreshes store info on reconnect, and syncs queued changes.
- CONFIRMED: GIVEN one explicit sync operation is running, WHEN another explicit sync operation is requested, THEN the later operation waits until the current operation finishes.
- CONFIRMED: GIVEN pending transaction changes exist, WHEN sync succeeds, THEN affected monthly transaction files are staged, transaction queue entries are removed, and balance recalculation starts from the earliest changed month.
- CONFIRMED: GIVEN logout succeeds, WHEN state reset completes, THEN provider credentials, IndexedDB, store info, pending counters, and authentication flags are cleared.
- CONFIRMED: GIVEN a remote monthly transaction file and queued local transaction rows for the same month, WHEN sync stages the monthly transaction file, THEN remote rows with the same ids as queued rows are replaced, queued rows marked `deleted` are omitted, and other remote rows are preserved.
- CONFIRMED: GIVEN a cached whole JSON file marked `to_sync` and the remote file has changed since the local cache timestamp, WHEN sync uploads the cached file, THEN the cached local file is written as the winning version and the user sees a visible warning naming the conflicted file.
- CONFIRMED: GIVEN a cached whole JSON file marked `to_sync` and no newer remote version exists, WHEN sync uploads the cached file, THEN the file is written without a conflict warning.
- REQUIRED: GIVEN queued IndexedDB transactions or files exist, WHEN a sync upload fails, THEN the affected pending items remain queued and pending counters still include them.
- REQUIRED: GIVEN a sync upload fails, WHEN the sync attempt finishes, THEN `inSync` is cleared and a shared sync-failed state is set.
- REQUIRED: GIVEN a shared sync-failed state is set, WHEN the app shell or sync status is visible, THEN the user sees a persistent sync-failed status/toast that is not automatically dismissed after a short timeout.
- REQUIRED: GIVEN a sync-failed status is visible, WHEN the user chooses retry from sync status, THEN the app attempts sync again for the queued items.
- REQUIRED: GIVEN a retry sync succeeds, WHEN pending counters are refreshed, THEN the sync-failed state and persistent sync-failed toast/status are cleared.
- CONFIRMED (RT-029): GIVEN any host, WHEN `getAvailableStorageProviders()` is called, THEN the `googleDrive` option has `available: false` and `planned: true`, and Dropbox remains `available: true`.
- CONFIRMED (RT-029): GIVEN `localStorage.storage_provider` is `"googleDrive"`, WHEN `getSelectedStorageProvider()` is called, THEN the host default is returned (`dropbox` outside `localhost:3000`, `httpServer` on it).
- CONFIRMED (RT-029): GIVEN `setSelectedStorageProvider("googleDrive")` is called, THEN `googleDrive` is not persisted and the host default is stored instead.
- CONFIRMED (RT-029): GIVEN the selected provider resolves to the default, WHEN `getStorage()` is called, THEN it never returns a Google Drive client (none exists) and returns `Dropbox` outside `localhost:3000`.
- CONFIRMED (RT-029): GIVEN the auth dialog lists providers, THEN options that are unavailable or planned (Google Drive) are not offered (`src/components/Auth.vue` filters `available && !planned`).
- REQUIRED (RT-029): Google Drive may move into scope only when all of these exist: a provider helper under `src/helpers/storage/` implementing the same read/write/metadata/list contract as Dropbox, an auth flow with token handling, and sync tests (read/write, expired credentials, sync failure/retry). Until then no spec may describe it as supported.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/storage.spec.ts` covers pending counters, serialized sync, info refresh, provider selection effects, and logout.
- CONFIRMED: `src/helpers/__tests__/files.spec.ts` covers cache read, remote read cache, and write-through cache.
- CONFIRMED: `src/helpers/__tests__/idb.spec.ts` covers IndexedDB wrapper operations.
- CONFIRMED: `src/helpers/__tests__/sync.spec.ts` covers transaction sync and file sync.
- CONFIRMED: `src/helpers/__tests__/storageIndex.spec.ts` and `httpServer.spec.ts` cover provider selection and local HTTP helper behavior.
- CONFIRMED: `src/helpers/__tests__/sync.spec.ts` and `src/stores/__tests__/storage.spec.ts` assert RT-002 failure reporting, queued pending state, persistent sync-failed notification metadata, and retry clearing behavior.

## Missing Tests / Coverage Gaps
- CONFIRMED: Required component, integration, and manual coverage levels for this feature are defined in `specs/testing-strategy.md` (RT-031); keep both in sync when closing a gap.
- CONFIRMED: `src/helpers/__tests__/dropbox.spec.ts` covers Dropbox auth failure and token refresh paths; Dropbox file read/write/list operations are not directly tested.
- CONFIRMED: No integration tests across Auth startup refresh, sync, balance recalculation, and store reloads.
- CONFIRMED: `src/helpers/__tests__/sync.spec.ts` asserts the exact staged transaction merge payload for same-id replacement, deleted queued rows, and preserved remote rows.
- CONFIRMED: `src/helpers/__tests__/sync.spec.ts` asserts whole-file conflict detection, last-writer-wins upload, and visible warning state.
- CONFIRMED: Sync helper tests prove failed file uploads are reported as failures and do not clear pending `to_sync` cache state.
- CONFIRMED: Storage store tests prove failed sync sets shared sync-failed state, keeps pending counters, clears `inSync`, emits persistent failure metadata, and clears failure state after a successful retry.
- CONFIRMED: The sync status button remains the retry action when sync has failed; no rendered component test currently covers the visual label/icon state.
- IMPLEMENTED (RT-029): `src/helpers/__tests__/storageIndex.spec.ts` asserts `googleDrive` is `available: false, planned: true` on localhost and non-localhost, a stored `"googleDrive"` selection falls back to the host default, `setSelectedStorageProvider("googleDrive")` stores the host default, and `getStorage()` returns Dropbox in that case. The optional `Auth.vue` rendering assertion is not added.

## Product Questions
- RESOLVED: File conflicts use last writer wins with a visible warning; transaction queue conflicts merge by id until a richer conflict UI exists.
- RESOLVED: RT-002 sync failures use a shared pattern: keep pending items queued, show a persistent sync-failed status/toast, and provide retry from sync status.
- RESOLVED (RT-029): Google Drive is out of scope until a provider helper, auth flow, and sync tests exist. Current code satisfies the behavior (unavailable, unselectable, falls back to the host default; no provider or auth code exists). Test coverage for it is not yet present (see Missing Tests).
