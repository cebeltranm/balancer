# Feature: Settings

## Goal
- CONFIRMED: Manage storage status/actions, stock API configuration, and target investment composition.

## Current Implemented Behavior
- CONFIRMED: `/settings/general` maps to `src/views/Settings.vue` and requires authentication.
- CONFIRMED: Settings shows current storage provider status, retry-login action, and clear-device-credentials action.
- CONFIRMED: Users can edit `stock_api.type`, `stock_api.host`, and `stock_api.key`.
- CONFIRMED: Users can edit target investment composition by asset class, region, and instrument type.
- CONFIRMED: Composition is edited as percentages in the UI and saved as decimal weights in `config.json`.
- CONFIRMED: Save preserves other existing config fields through spreading `configStore.config`.

## User Flows
- CONFIRMED: Open settings and see storage connection summary.
- CONFIRMED: Retry login for the selected provider; successful retry reloads the page.
- CONFIRMED (decision RT-018): A failed retry shows an error toast and leaves the page and store state unchanged (see Error Handling). Code status: NOT IMPLEMENTED.
- CONFIRMED: Clear local device credentials.
- CONFIRMED: Edit stock API fields.
- CONFIRMED: Edit composition weights and save.

## Inputs And Outputs
- CONFIRMED: Inputs are current `config.json`, storage status, stock API form fields, and composition matrix edits.
- CONFIRMED: Outputs are updated `config.json`, toast notifications, storage login retries, and cleared local credentials.

## Data Files Read/Written
- CONFIRMED: Reads and writes `config.json`.
- CONFIRMED: Reads provider state from storage helpers; no other domain files are written.

## Store / Helper / Component Files Involved
- CONFIRMED: `src/views/Settings.vue`, `src/stores/config.ts`, `src/stores/storage.ts`, `src/types.ts`.

## Error Handling
- CONFIRMED: Composition save rejects invalid negative/non-numeric weights.
- CONFIRMED: Composition save rejects total allocation not equal to 100%.
- CONFIRMED: Failed config save shows an error toast.
- CONFIRMED: Successful save rehydrates form state and shows success toast.
- CONFIRMED (decision RT-018): When retry login fails, Settings shows an error toast. If the provider supplies a specific failure message, the toast detail uses it; otherwise the detail is a generic retry-later message (e.g. "Could not log in to {provider}. Please try again later.").
- CONFIRMED (decision RT-018): A failed retry keeps existing state unchanged: no page reload, no change to `storeInfo`/`status`, and no local credentials or queued data are cleared.
- CONFIRMED (decision RT-018): A provider returning `false` because it is redirecting to an external sign-in (Dropbox OAuth) is not a failure and shows no error toast.
- CONFIRMED (current code, gap): `retryLogin()` in `src/views/Settings.vue` only handles a truthy result; a `false` result is silent and a thrown error is not caught. Code status: NOT IMPLEMENTED.

## Edge Cases
- CONFIRMED: `normalizeComposition()` includes default asset classes plus config-defined classes.
- CONFIRMED: Region rows include defined geographic exposure options plus `Global`.
- CONFIRMED: Instrument types include defaults `ETF` and `MutualFund` plus any configured types.
- INFERRED: Saving writes zero-valued weights for every generated region/type cell.

## Acceptance Criteria
- CONFIRMED: GIVEN composition weights total anything other than 100%, WHEN the user saves, THEN save is blocked and an error toast is shown.
- CONFIRMED: GIVEN composition weights contain a negative or non-numeric value, WHEN the user saves, THEN save is blocked and an error toast is shown.
- CONFIRMED: GIVEN valid stock API fields are saved, WHEN `config.json` is written, THEN values persist under `stock_api`.
- CONFIRMED: GIVEN valid composition weights are saved, WHEN `config.json` is written, THEN values persist under `inv_composition` as decimal weights.
- CONFIRMED: GIVEN local credentials exist, WHEN the user clears credentials, THEN `crlocal` is removed and local authentication becomes false.
- CONFIRMED (decision RT-018): GIVEN the user clicks Retry login, WHEN the provider login throws or returns `false` without redirecting, THEN an error toast is shown and the page is not reloaded. Code status: NOT IMPLEMENTED.
- CONFIRMED (decision RT-018): GIVEN retry login fails AND the provider supplied a specific failure message, WHEN the toast is shown, THEN its detail is that provider message. Code status: NOT IMPLEMENTED (no provider currently supplies one).
- CONFIRMED (decision RT-018): GIVEN retry login fails AND no provider-specific message is available, WHEN the toast is shown, THEN its detail is the generic retry-later message. Code status: NOT IMPLEMENTED.
- CONFIRMED (decision RT-018): GIVEN retry login fails, WHEN the toast is shown, THEN `storeInfo`, `status`, and stored credentials are identical to their values before the click. Code status: PARTIALLY SATISFIED (`storage.login()` does not refresh state when `doAuth` returns `false`; a thrown error is not caught in the view).
- CONFIRMED (decision RT-018): GIVEN the provider is redirecting to external sign-in (Dropbox `doAuth` returns `false`), WHEN retry login completes, THEN no error toast is shown. Code status: SATISFIED (no toast is shown for any failure today); must be preserved when the error toast is added.
- CONFIRMED (decision RT-018): GIVEN retry login succeeds, WHEN it completes, THEN the success toast is shown and the page reloads. Code status: SATISFIED.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/config.spec.ts` covers load, save, and composition grouping.
- CONFIRMED: `src/stores/__tests__/storage.spec.ts` covers reset/logout related state.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered `Settings.vue` tests.
- CONFIRMED: No tests for composition normalization/building.
- CONFIRMED: No tests for retry login UI behavior or credential-clearing toast.

## Test Expectations (RT-018)
- Add `src/views/__tests__/Settings.spec.ts` (mounted view, mocked storage store and toast). Expected cases:
  - login resolves `true` -> success toast and `window.location.reload` called.
  - login resolves `false` with a non-redirecting provider (HttpServer) -> generic error toast, no reload.
  - login resolves `false` with Dropbox -> no error toast, no reload.
  - login rejects with a plain `Error` -> generic error toast, no unhandled rejection, no reload.
  - login rejects with an error carrying a provider message -> toast detail equals that message.
  - after any failure, `storeInfo` and `status` are unchanged.
- Extend `src/helpers/__tests__/httpServer.spec.ts`: `doAuth` returns `false` on a non-200 response and does not store a token.
- Extend `src/stores/__tests__/storage.spec.ts`: `login()` returning `false` does not call `refreshStoreInfo` or seed `config.json`.
- Status: none of these tests exist yet.

## Product Questions
- UNCLEAR: Should zero-valued generated composition cells be persisted or omitted for compactness?
- RESOLVED (RT-018): Retry-login failures show provider-specific remediation text when the provider supplies it, otherwise a generic retry-later message; existing state is left unchanged.
