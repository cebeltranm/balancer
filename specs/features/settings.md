# Feature: Settings

## Goal
- CONFIRMED: Manage storage status/actions, stock API configuration, and target investment composition.

## Observed Implementation
- CONFIRMED: `/settings/general` maps to `src/views/Settings.vue` and requires authentication.
- CONFIRMED: Settings shows current storage provider status, retry-login action, and clear-device-credentials action.
- CONFIRMED: Users can edit `stock_api.type`, `stock_api.host`, and `stock_api.key`.
- CONFIRMED: Users can edit target investment composition by asset class, region, and instrument type.
- CONFIRMED: Composition is edited as percentages in the UI and saved as decimal weights in `config.json`.
- CONFIRMED: Save preserves other existing config fields through spreading `configStore.config`.
- CONFIRMED: Contract status: satisfied for RT-007, RT-018, and RT-019.

## Product Contract
- REQUIRED (RT-019): Zero-valued composition cells are omitted on save and read as zero when missing; existing files with explicit zeros stay valid.
- REQUIRED (RT-018): Retry-login failures show provider-specific text when available, otherwise a generic retry-later message, and leave state unchanged.
- REQUIRED (RT-007): Missing `config.json` is seeded with the minimum shape `{ "stock_api": {}, "inv_composition": {} }`; existing or invalid files are never overwritten.

## User Flows
- CONFIRMED: Open settings and see storage connection summary.
- CONFIRMED: Retry login for the selected provider; successful retry reloads the page.
- CONFIRMED (decision RT-018): A failed retry shows an error toast and leaves the page and store state unchanged (see Error Handling). Code status: SATISFIED.
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
- CONFIRMED (current code, gap): `retryLogin()` in `src/views/Settings.vue` only handles a truthy result; a `false` result is silent and a thrown error is not caught. Code status: SATISFIED.

## Edge Cases
- CONFIRMED: `normalizeComposition()` includes default asset classes plus config-defined classes.
- CONFIRMED: Region rows include defined geographic exposure options plus `Global`.
- CONFIRMED: Instrument types include defaults `ETF` and `MutualFund` plus any configured types.
- CONFIRMED (decision RT-019): `buildCompositionFromMatrix()` in `src/views/Settings.vue` writes only cells with a weight greater than 0; the generated matrix used for editing still contains every asset class/region/type cell. Code status: SATISFIED (implemented; zero cells, empty regions, and all-zero asset classes are omitted).
- CONFIRMED (decision RT-019): Zero-valued composition cells are omitted on save; a missing cell means a `0` weight. Hard zero targets are not stored.
- CONFIRMED (current code): Read paths already treat missing cells as zero: `normalizeComposition()` fills missing types with `0` in the form, `groupComposition`/`invCompositionByRegion` in `src/stores/config.ts` only sum present keys, and `mapInvestmentsBySubCategory` in `src/helpers/investments.ts` falls back to `0` for missing expected entries. Code status: SATISFIED.

## Acceptance Criteria
- CONFIRMED: GIVEN composition weights total anything other than 100%, WHEN the user saves, THEN save is blocked and an error toast is shown.
- CONFIRMED: GIVEN composition weights contain a negative or non-numeric value, WHEN the user saves, THEN save is blocked and an error toast is shown.
- CONFIRMED: GIVEN valid stock API fields are saved, WHEN `config.json` is written, THEN values persist under `stock_api`.
- CONFIRMED: GIVEN valid composition weights are saved, WHEN `config.json` is written, THEN values persist under `inv_composition` as decimal weights.
- CONFIRMED: GIVEN local credentials exist, WHEN the user clears credentials, THEN `crlocal` is removed and local authentication becomes false.
- CONFIRMED (decision RT-018): GIVEN the user clicks Retry login, WHEN the provider login throws or returns `false` without redirecting, THEN an error toast is shown and the page is not reloaded. Code status: SATISFIED.
- CONFIRMED (decision RT-018): GIVEN retry login fails AND the provider supplied a specific failure message, WHEN the toast is shown, THEN its detail is that provider message. Code status: SATISFIED (HttpServer supplies a message via `StorageAuthError` when the server is unreachable; other failures use the generic message).
- CONFIRMED (decision RT-018): GIVEN retry login fails AND no provider-specific message is available, WHEN the toast is shown, THEN its detail is the generic retry-later message. Code status: SATISFIED.
- CONFIRMED (decision RT-018): GIVEN retry login fails, WHEN the toast is shown, THEN `storeInfo`, `status`, and stored credentials are identical to their values before the click. Code status: SATISFIED (`storage.login()` does not refresh state when `doAuth` returns `false`; the view catches thrown errors).
- CONFIRMED (decision RT-018): GIVEN the provider is redirecting to external sign-in (Dropbox `doAuth` returns `false`), WHEN retry login completes, THEN no error toast is shown. Code status: SATISFIED (no toast is shown for any failure today); must be preserved when the error toast is added.
- CONFIRMED (decision RT-018): GIVEN retry login succeeds, WHEN it completes, THEN the success toast is shown and the page reloads. Code status: SATISFIED.
- REQUIRED (decision RT-019): GIVEN the composition matrix contains zero-valued cells, WHEN the user saves, THEN `inv_composition` in `config.json` contains only cells with a weight greater than 0. Code status: SATISFIED.
- REQUIRED (decision RT-019): GIVEN a region has no non-zero instrument types, WHEN the user saves, THEN that region key is omitted (no empty `{}` region object). Code status: SATISFIED.
- REQUIRED (decision RT-019): GIVEN an asset class has no non-zero cells, WHEN the user saves, THEN that asset class key is omitted. Code status: SATISFIED.
- REQUIRED (decision RT-019): GIVEN non-zero cells, WHEN saved, THEN values remain decimal weights (percentage / 100) and the 100% total validation is unchanged. Code status: SATISFIED for value scaling and validation.
- REQUIRED (decision RT-019): GIVEN a `config.json` whose `inv_composition` omits asset classes, regions, or instrument types, WHEN it is loaded, THEN missing cells read as `0` in the settings form and contribute `0` to store totals and portfolio expected values. Code status: SATISFIED.
- REQUIRED (decision RT-019): GIVEN an existing `config.json` with explicit zero weights, WHEN it loads, THEN it is still valid and unchanged until the next save, which compacts it. Code status: SATISFIED (loading does not rewrite the file).

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/config.spec.ts` covers load, save, and composition grouping, including sparse vs. explicit-zero totals.
- CONFIRMED: `src/views/__tests__/SettingsComposition.spec.ts` covers sparse composition save, compaction of explicit zeros, and round-trip (RT-019).
- CONFIRMED: `src/stores/__tests__/storage.spec.ts` covers reset/logout related state and login returning `false`.
- CONFIRMED: `src/views/__tests__/Settings.spec.ts` covers retry-login success, failure, provider message, and Dropbox redirect.

## Missing Tests / Coverage Gaps
- CONFIRMED: Required component, integration, and manual coverage levels for this feature are defined in `specs/testing-strategy.md` (RT-031); keep both in sync when closing a gap.
- CONFIRMED: `Settings.vue` rendered tests cover retry login only (`src/views/__tests__/Settings.spec.ts`); config/composition editing is untested.
- CONFIRMED: Composition normalization/building is covered only through the mounted view (`src/views/__tests__/SettingsComposition.spec.ts`); there are no standalone helper tests.
- CONFIRMED: No tests for the credential-clearing toast.

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
- Status: implemented in `src/views/__tests__/Settings.spec.ts`, `src/helpers/__tests__/httpServer.spec.ts`, and `src/stores/__tests__/storage.spec.ts`.

## Test Expectations (RT-019)
- Unit test for composition build (extract `normalizeComposition`/`buildCompositionFromMatrix` into a helper under `src/helpers/` or test via the mounted view): a matrix mixing zero and non-zero cells yields only non-zero cells, as decimals (`/100`), with no empty region objects and no all-zero asset classes.
- Round-trip test: build then normalize restores the same matrix, with omitted cells reading as `0`.
- Settings view test: saving calls `configStore.saveConfig` with a sparse `inv_composition`, and other config fields are preserved.
- Extend `src/stores/__tests__/config.spec.ts`: `invCompositionByAssetClass` and `invCompositionByRegion` give identical totals for sparse data and for the same data with explicit zeros.
- Extend `src/helpers/__tests__/investments.spec.ts`: `mapInvestmentsBySubCategory` returns `expected: 0` when the expected entry is missing.
- Status: IMPLEMENTED. Save/round-trip/compaction cases are in `src/views/__tests__/SettingsComposition.spec.ts` (mounted view); sparse-vs-explicit-zero totals are in `src/stores/__tests__/config.spec.ts`; missing expected entries are in `src/helpers/__tests__/investments.spec.ts`. Standalone helper extraction was not done.

## Product Questions
- RESOLVED (RT-019): Zero-valued composition cells are omitted on save; missing cells are read as zero. Users needing hard zero targets are out of scope for now. Backward compatibility: existing files with explicit zeros stay valid and are compacted on next save.
- RESOLVED (RT-018): Retry-login failures show provider-specific remediation text when the provider supplies it, otherwise a generic retry-later message; existing state is left unchanged.
