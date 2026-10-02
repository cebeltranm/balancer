# Feature: Authentication

## Goal
- CONFIRMED: Gate sensitive app areas behind storage login and local device authentication.

## Current Implemented Behavior
- CONFIRMED: `src/components/Auth.vue` coordinates storage-provider login, WebAuthn credential registration, WebAuthn authentication, initial file loading, and cache refresh.
- CONFIRMED: Router emits `CHECK_AUTHENTICATE` for all routes except `/` and `/expenses`.
- CONFIRMED: `App.vue` listens for `CHECK_AUTHENTICATE` and opens the auth dialog when `storageStore.status.authenticated` is false.
- CONFIRMED: Dropbox login uses OAuth PKCE and stores access/refresh tokens.
- CONFIRMED: Local HTTP server login stores a fixed development bearer token and sets authenticated true after successful login.
- CONFIRMED: WebAuthn registration creates a public-key credential and stores local metadata in `localStorage.crlocal`.
- CONFIRMED: WebAuthn authentication sets `storageStore.status.authenticated = true` and closes the dialog.
- CONFIRMED: Logout clears provider credentials through the selected provider, clears IndexedDB, resets storage state, navigates home, and re-emits authentication check.

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
- CONFIRMED: HTTP server provider bypasses WebAuthn and marks authenticated true.
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

## Product Questions
- UNCLEAR: Should local WebAuthn be mandatory for all non-local providers, or should users be able to opt out?
- RESOLVED (RT-020): When local credentials are lost or failing but provider credentials still exist, the recovery path is the auth dialog action Reset local credentials followed by Register Credentials; provider tokens and cached data are kept. The dialog action is implemented.
