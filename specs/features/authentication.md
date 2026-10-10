# Feature: Authentication

## Goal
- CONFIRMED: Gate sensitive app areas behind storage login and local device authentication.

## Observed Implementation
- CONFIRMED: `src/components/Auth.vue` coordinates storage-provider login, WebAuthn credential registration, WebAuthn authentication, initial file loading, and cache refresh.
- CONFIRMED: Router emits `CHECK_AUTHENTICATE` for all routes except `/` and `/expenses`.
- CONFIRMED: `App.vue` listens for `CHECK_AUTHENTICATE` and opens the auth dialog when `storageStore.status.authenticated` is false.
- CONFIRMED: Dropbox login uses OAuth PKCE and stores access/refresh tokens.
- CONFIRMED: Local HTTP server login stores a fixed development bearer token and sets authenticated true after successful login. Per RT-021 this bypass is development-only (see Acceptance Criteria).
- CONFIRMED: WebAuthn registration creates a public-key credential and stores local metadata in `localStorage.crlocal`.
- CONFIRMED: WebAuthn authentication sets `storageStore.status.authenticated = true` and closes the dialog.
- CONFIRMED: Logout clears provider credentials through the selected provider, clears IndexedDB, resets storage state, navigates home, and re-emits authentication check.
- CONFIRMED: Contract status: satisfied for RT-020, RT-021, RT-023, and RT-029 as recorded in the per-criterion "Code status" notes below, including the noted `checkStore()` gap.

## Product Contract
- REQUIRED (RT-021): Local WebAuthn is mandatory for Dropbox-backed sensitive routes with no opt-out; the HTTP server bypass is development-only and available only on the local dev host.
- REQUIRED (RT-020): WebAuthn, provider-login, and Dropbox token-refresh failures show a readable message with Retry, Reset local credentials, and Restart provider login; recovery never clears queued sync data and never silently redirects to provider sign-in.
- REQUIRED (RT-023): First run follows the documented checklist (storage login, seed accounts, register local credential, review/edit accounts, confirm config); there is no dedicated onboarding UI.
- REQUIRED (RT-029): Google Drive is unavailable and must not be treated as a supported provider.

## User Flows
- CONFIRMED: First visit opens authentication dialog when storage login or local credentials are missing.
- CONFIRMED: User selects available storage provider and logs in to storage.
- CONFIRMED: User registers local device credentials after storage login.
- CONFIRMED: Returning user authenticates with local credentials.
- CONFIRMED: User logs out from the app menu with confirmation.

## Inputs And Outputs
- CONFIRMED: Inputs are selected provider, Dropbox OAuth code, provider tokens, local WebAuthn credential metadata, and browser credential APIs.
- CONFIRMED: Outputs are storage login state, local authenticated state, seeded initial files, loaded stores, and cleared state on logout.

## Data Files Read/Written
- CONFIRMED: During first storage check, missing `accounts.json` is seeded from `public/accounts.json`.
- CONFIRMED: After login, basic loading reads `accounts.json`, `config.json`, current and previous year values/balance/budget files, and recent transactions.
- CONFIRMED: Authentication writes no domain JSON except initial `accounts.json` seeding and current-month values/balance bootstrapping.

## Store / Helper / Component Files Involved
- CONFIRMED: `src/components/Auth.vue`, `src/App.vue`, `src/router/index.ts`, `src/stores/storage.ts`, `src/helpers/storage/dropbox.ts`, `src/helpers/storage/http_server.ts`, `src/helpers/events.ts`.

## Error Handling
- CONFIRMED: Dropbox `getInfo()` attempts token refresh on 401 when allowed.
- CONFIRMED: WebAuthn registration errors are logged.
- CONFIRMED: HTTP server 401 clears local token.
- RESOLVED (RT-020): WebAuthn, provider-login, and Dropbox token-refresh failures share one auth error state held in the storage store (`status.authError`: `kind` of `webauthn`, `provider-login`, or `token-refresh`; optional `provider`; user-safe `message`). The auth dialog renders this state with three actions: **Retry** (repeat the failed step), **Reset local credentials** (remove `localStorage.crlocal`, clear the error, return to local credential registration), and **Restart provider login** (clear provider tokens only, clear the error, start provider login again).
- RESOLVED (RT-020): Auth errors are cleared on successful login/authentication, `logout()`, `selectProvider()`, and `resetLocalCredentials()`. Provider-login restart must never clear IndexedDB or queued `to_sync` data.
- RESOLVED (RT-020): A failed Dropbox token refresh must not silently redirect to Dropbox sign-in from `getInfo()`. It surfaces a `StorageAuthError` and the user chooses Retry or Restart provider login. Redirecting is allowed only from an explicit user-initiated login.
- RESOLVED (RT-020): Failure messages shown to users come from `StorageAuthError.message` or a friendly mapping of WebAuthn `DOMException` names (for example `NotAllowedError`, `InvalidStateError`); raw error text and stack traces are logged, not displayed.
- CONFIRMED: Code satisfies RT-020. `src/stores/storage.ts` holds `status.authError` with `setAuthError()`, `clearAuthError()`, and `restartProviderLogin()`; `refreshStoreInfo()` converts a Dropbox `StorageAuthError` into a `token-refresh` error. `src/components/Auth.vue` catches WebAuthn and provider-login failures and renders the message with Retry, Reset local credentials, and Restart provider login actions. `src/helpers/storage/dropbox.ts` throws `StorageAuthError` for a failed refresh or rejected authorization code instead of redirecting silently.
- CONFIRMED: Partial building blocks exist: `src/helpers/storageAuthError.ts` (`StorageAuthError`, `isStorageAuthError`), HTTP server `doAuth()` throwing `StorageAuthError` when unreachable, and `storage.ts` `resetLocalCredentials()`.

## Edge Cases
- CONFIRMED: Auth dialog is closable only when local credentials exist.
- CONFIRMED: Dropbox callback query `code` triggers storage login and then router query cleanup.
- CONFIRMED: HTTP server provider bypasses WebAuthn and marks authenticated true. RESOLVED (RT-021): this bypass is a development-only convenience, not a product behavior; it is only reachable on the local dev host (`localhost:3000`).
- INFERRED: WebAuthn metadata is local to the browser/device; changing browser storage requires re-registration.

## Acceptance Criteria
- CONFIRMED: GIVEN a protected route is requested while `authenticated` is false, WHEN the router emits an auth check, THEN the authentication dialog opens before protected content is shown.
- CONFIRMED: GIVEN `/` or `/expenses` is requested while `authenticated` is false, WHEN navigation occurs, THEN the router does not emit an auth check for those routes.
- CONFIRMED: GIVEN Dropbox login completes with OAuth tokens, WHEN storage status refreshes, THEN storage login state becomes true and local credential registration can proceed.
- CONFIRMED: GIVEN logout succeeds, WHEN reset completes, THEN `loggedIn`, `authenticated`, `offline`, pending counters, provider credentials, and IndexedDB cache are reset.
- CONFIRMED: GIVEN local credential reset is requested, WHEN reset completes, THEN `localStorage.crlocal` is removed and `authenticated` becomes false.
- RESOLVED (RT-020): GIVEN `navigator.credentials.get()` rejects or resolves null during authentication, WHEN the dialog handles it, THEN `authenticated` stays false, no unhandled rejection occurs, `status.authError.kind` is `webauthn`, and the dialog shows a readable message with Retry, Reset local credentials, and Restart provider login actions. Code status: SATISFIED.
- RESOLVED (RT-020): GIVEN `navigator.credentials.create()` rejects during registration, WHEN the dialog handles it, THEN `status.authError.kind` is `webauthn`, no `crlocal` entry is written, and the same three actions are shown. Code status: SATISFIED.
- RESOLVED (RT-020): GIVEN provider login throws `StorageAuthError` or returns false (not a Dropbox redirect), WHEN `doLoginStore()` finishes, THEN `status.authError.kind` is `provider-login`, the provider-specific message is shown in the dialog, and `loggedIn`/`authenticated` are not set. Code status: SATISFIED.
- RESOLVED (RT-020): GIVEN Dropbox returns 401 and refreshing the token fails, WHEN `getInfo()` runs, THEN a `StorageAuthError("Dropbox", ...)` is surfaced as `kind: token-refresh`, `window.location.href` is not changed, and stored tokens are left until the user chooses Restart provider login. Code status: SATISFIED.
- RESOLVED (RT-020): GIVEN an auth error is shown, WHEN the user chooses Retry, THEN the failed step (authenticate, register, or provider login) runs again and the error clears on success or is replaced on failure. Code status: SATISFIED.
- RESOLVED (RT-020): GIVEN an auth error is shown, WHEN the user chooses Reset local credentials, THEN `localStorage.crlocal` is removed, `authenticated` is false, the error is cleared, provider credentials stay intact, and the dialog offers Register Credentials. Code status: SATISFIED.
- RESOLVED (RT-020): GIVEN an auth error is shown, WHEN the user chooses Restart provider login, THEN provider tokens are cleared through the provider `logout()`, IndexedDB and pending sync queues are untouched, the error is cleared, and provider login starts again. Code status: SATISFIED.
- RESOLVED (RT-020): GIVEN the auth dialog is in the error state, THEN the recovery actions are reachable without visiting a protected route, even when the dialog is otherwise not closable. Code status: SATISFIED.
- RESOLVED (RT-021): GIVEN the provider is Dropbox and the user is logged in to storage, WHEN a sensitive route is shown, THEN `status.authenticated` stays false until `navigator.credentials.get()` succeeds (or registration succeeds when no `crlocal` exists); provider login alone never sets `authenticated`. Code status: SATISFIED (`Auth.vue` only auto-authenticates `type === "HttpServer"`).
- RESOLVED (RT-021): GIVEN the provider is Dropbox with no `crlocal`, WHEN the dialog is shown, THEN it is visible, shows Register Credentials, and offers no skip or opt-out. Code status: SATISFIED.
- RESOLVED (RT-021): GIVEN the provider is the local HTTP server on the local dev host, WHEN storage login succeeds, THEN `authenticated` becomes true without calling WebAuthn, and the dialog is hidden. This is the only WebAuthn bypass. Code status: SATISFIED.
- RESOLVED (RT-021): GIVEN a non-dev host (anything other than `localhost:3000`), WHEN the HTTP server provider is selected or persisted from an earlier session, THEN it must not bypass WebAuthn. Code status: SATISFIED. `isLocalDevHost()` gates the provider option list and the provider factory (which falls back to Dropbox), and both bypass points (`Auth.vue` `onMounted` and `storage.ts` `refreshStoreInfo()`) now also require `isLocalDevHost()`.
- RESOLVED (RT-021): GIVEN documentation or UI copy describes the HTTP server provider, THEN it states that it is development-only and bypasses local device authentication. Code status: SATISFIED in the provider option description ("local development storage server"); the specs now state the bypass explicitly.
- RESOLVED (RT-021): Sensitive routes are those the router guard emits `CHECK_AUTHENTICATE` for, i.e. every route except `/` and `/expenses`. Whether `/` and `/expenses` need gating is not decided here and keeps the current behavior.
- RESOLVED (RT-023): First-run is a documented checklist, not a dedicated onboarding wizard. A user is "set up" after completing, in order: (1) storage login, (2) seed accounts, (3) register local credential, (4) review/edit accounts, (5) confirm base currency/config. Code status per step is listed below.
- RESOLVED (RT-023): GIVEN the user has no storage login, WHEN the app opens, THEN the auth dialog is shown with the provider selector and "Login to store"; no domain file is read or written before login succeeds. Code status: SATISFIED (`Auth.vue` `onMounted`, `doLoginStore()`).
- RESOLVED (RT-023): GIVEN storage login succeeds and `accounts.json` is missing from storage, WHEN `checkStore()` runs, THEN `accounts.json` is written once from `public/accounts.json`. Code status: SATISFIED for the interactive-login path (`Auth.vue` `attemptLogin()` -> `checkStore()`). GAP: `checkStore()` is not called on `onMounted` for an already-logged-in session, so a missing `accounts.json` is not re-seeded on a later load; this is accepted for now and not required by RT-023.
- RESOLVED (RT-023): GIVEN `accounts.json` already exists and is valid, WHEN `checkStore()` runs, THEN it is not overwritten. Code status: SATISFIED (the file is only written when the read returns nothing).
- RESOLVED (RT-023): GIVEN `accounts.json` exists but is invalid or malformed, WHEN `checkStore()` runs, THEN the seed must not overwrite it and the recoverable invalid-file rules in `specs/data-model.md` apply. Code status: SATISFIED. `readJsonFile` throws a `PersistedFileError` for an invalid remote file instead of returning a falsy value, so `checkStore()` never reaches the seed write; covered by `Auth.spec.ts`. The thrown error is caught by Vue's error handler and no dedicated recovery message is shown at this step.
- RESOLVED (RT-023): GIVEN storage login succeeded and the user has no `crlocal`, WHEN the dialog is shown, THEN Register Credentials is the next action and is enabled only after storage login. Code status: SATISFIED (see RT-021 criteria).
- RESOLVED (RT-023): GIVEN setup steps 1-3 are complete, THEN the user reviews and edits the seeded accounts on the Accounts view (names, currencies, types, hide/unhide); the seed is a starting template, not a final configuration, and its currencies (`cop`, `usd`) are not a user choice. Code status: SATISFIED for editing (accounts store and view); no in-app prompt directs a new user there, and none is required.
- RESOLVED (RT-023): GIVEN setup is complete, THEN the user confirms configuration in Settings, which exposes `config.json` (`stock_api`, `inv_composition`), which is seeded as `{ "stock_api": {}, "inv_composition": {} }` after first successful storage initialization. Code status: SATISFIED for config seeding and editing. The product has no base-currency setting; in this checklist "base currency" means reviewing the currency on each seeded account. A dedicated `base_currency` config field is out of scope for RT-023 and needs its own requirement and data-model change.
- RESOLVED (RT-023): GIVEN the checklist is documented, THEN `README.md` "First Run" and this spec describe the five steps in order. Code status: SATISFIED (`README.md` has a "First Run" section).
- RESOLVED (RT-023): No app code change is required to satisfy the decision as documented. Overall status: IMPLEMENTED. Steps 1-3, seeding (including no overwrite of valid or invalid `accounts.json`), and config seeding are implemented and tested; account review/edit is implemented without an in-app prompt; the checklist is documented in `README.md`; base currency has no code counterpart by design. Known accepted gap: `checkStore()` runs only after an interactive login, so a missing `accounts.json` is not re-seeded on a later load.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/storage.spec.ts` covers logout, provider selection, and state reset.
- CONFIRMED: `src/helpers/__tests__/httpServer.spec.ts` covers local token login/session/logout behavior.
- CONFIRMED: `src/helpers/__tests__/storageIndex.spec.ts` covers provider selection.

## Missing Tests / Coverage Gaps
- CONFIRMED: `src/components/__tests__/Auth.spec.ts` renders `Auth.vue` and covers the RT-020 failure and recovery flows; other dialog flows (provider selection, initial file loading) remain untested.
- CONFIRMED: WebAuthn is mocked for authenticate/register success and failure paths in `Auth.spec.ts`; no test covers a real browser credential API.
- CONFIRMED: No router guard tests for protected/unprotected routes.
- CONFIRMED: `src/helpers/__tests__/dropbox.spec.ts` covers token refresh success/failure and rejected authorization codes; the full OAuth redirect round trip is untested.
- CONFIRMED: `src/stores/__tests__/storage.spec.ts` covers `resetLocalCredentials()`, `authError` set/clear, and `restartProviderLogin()`.

## Test Expectations (RT-020) — status: implemented and passing
- IMPLEMENTED: `src/stores/__tests__/storage.spec.ts` covers `setAuthError`/`clearAuthError`; `resetLocalCredentials()` removing `crlocal` and clearing `authError`; `restartProviderLogin()` calling the provider `logout()` then `login()` without `idb.clearDatabase()`; and `logout()`/`selectProvider()`/successful `login()` clearing `authError`.
- IMPLEMENTED: New `src/components/__tests__/Auth.spec.ts` mocks `navigator.credentials` and asserts: `get` rejecting (`NotAllowedError`) and resolving null, `create` rejecting, and `StorageAuthError` from login each set the matching `authError.kind`, show the message, leave `authenticated` false, and raise no unhandled rejection; each of Retry, Reset local credentials, and Restart provider login invokes the right action and clears or replaces the error.
- IMPLEMENTED: New `src/helpers/__tests__/dropbox.spec.ts` mocks the `dropbox` SDK and asserts: refresh success stores the new access token; refresh failure throws `StorageAuthError` without changing `window.location.href` from `getInfo()`; an invalid or expired authorization code throws `StorageAuthError` and clears the code verifier.
- IMPLEMENTED: `src/views/__tests__/Settings.spec.ts` keeps its retry-toast assertions; update only if Settings is moved onto the shared store actions. Existing `status` mocks gain `authError: null` where status equality is asserted.

## Test Expectations (RT-021) — status: implemented and passing
- IMPLEMENTED: `src/components/__tests__/Auth.spec.ts` — Dropbox, logged in, `crlocal` present: `authenticated` stays false until `navigator.credentials.get` resolves, then becomes true.
- IMPLEMENTED: `Auth.spec.ts` — Dropbox, logged in, no `crlocal`: dialog visible with Register Credentials, `authenticated` false, no skip action rendered.
- IMPLEMENTED: `Auth.spec.ts` — HttpServer, logged in, on `localhost:3000`: `authenticated` true, `navigator.credentials.get`/`create` not called, dialog hidden.
- IMPLEMENTED: `Auth.spec.ts` — HttpServer type on a non-dev host does not auto-authenticate.
- EXISTING: `src/helpers/__tests__/storageIndex.spec.ts` already asserts `httpServer` is not offered and Dropbox is used on a non-dev host, including a persisted `httpServer` selection.
- IMPLEMENTED: `src/router/__tests__/guard.spec.ts` (new) — `CHECK_AUTHENTICATE` is emitted for protected paths and not for `/` and `/expenses` (also closes the existing router-guard coverage gap).

## Test Expectations (RT-023) — status: implemented and passing
- IMPLEMENTED: `src/components/__tests__/Auth.spec.ts` — after a successful provider login with `readJsonFile("accounts.json", false)` returning nothing, `fetch("./accounts.json")` is called and `writeJsonFile("accounts.json", <seed>)` is called exactly once.
- IMPLEMENTED: `Auth.spec.ts` — after a successful provider login with a valid existing `accounts.json`, `fetch("./accounts.json")` and `writeJsonFile("accounts.json", ...)` are not called.
- IMPLEMENTED: `Auth.spec.ts` — when `accounts.json` is invalid JSON, the seed write is not performed and the remote file is preserved.
- IMPLEMENTED: `src/stores/__tests__/accounts.spec.ts` — a test that parses `public/accounts.json` through the account loader and asserts every entry has a valid `AccountType` and a non-empty `currency`, so the seed stays loadable.
- EXISTING: `src/stores/__tests__/storage.spec.ts:124-164` already covers `config.json` seeding, no seeding when login returns false, and no seeding over an invalid config file.
- EXISTING: `Auth.spec.ts` RT-020/RT-021 tests cover the credential registration step (register after login, no skip); the RT-023 block also asserts Register Credentials is offered after login.
- NOT REQUIRED: tests for a base-currency setting; none exists.

## Product Questions
- RESOLVED (RT-021): Local WebAuthn is mandatory for Dropbox-backed sensitive routes; there is no opt-out. The HTTP server WebAuthn bypass is development-only and must not be available outside the local dev host. Google Drive is unavailable (see RT-029), so no other non-local provider is in scope. Acceptance criteria and test expectations are in the RT-021 sections above; WebAuthn remains a local UI gate, not encryption of data or provider credentials.
- RESOLVED (RT-020): When local credentials are lost or failing but provider credentials still exist, the recovery path is the auth dialog action Reset local credentials followed by Register Credentials; provider tokens and cached data are kept. The dialog action is implemented.
- RESOLVED (RT-023): First-run follows the documented checklist (storage login, seed accounts, register local credential, review/edit accounts, confirm base currency/config) with no dedicated onboarding UI. Acceptance criteria and test expectations are in the RT-023 sections above; "base currency" is interpreted as account currencies plus `config.json` until a base-currency requirement exists.
