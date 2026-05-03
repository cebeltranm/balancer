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
- UNCLEAR: Failed WebAuthn authentication is not caught in `authenticate()`.
- UNCLEAR: UI does not present detailed provider/auth error messages.

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
- UNCLEAR: The expected user-facing behavior for WebAuthn failures and provider-login failures is not specified.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/storage.spec.ts` covers logout, provider selection, and state reset.
- CONFIRMED: `src/helpers/__tests__/httpServer.spec.ts` covers local token login/session/logout behavior.
- CONFIRMED: `src/helpers/__tests__/storageIndex.spec.ts` covers provider selection.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered `Auth.vue` tests.
- CONFIRMED: No WebAuthn mock tests for register/authenticate flows.
- CONFIRMED: No router guard tests for protected/unprotected routes.
- CONFIRMED: No Dropbox OAuth/token-refresh tests.

## Product Questions
- UNCLEAR: Should local WebAuthn be mandatory for all non-local providers, or should users be able to opt out?
- UNCLEAR: What recovery path should exist when local credentials are lost but provider credentials still exist?
