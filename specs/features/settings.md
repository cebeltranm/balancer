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
- UNCLEAR: Retry login failures do not show a dedicated error toast.

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
- UNCLEAR: The expected UI feedback for retry-login failures is not specified.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/config.spec.ts` covers load, save, and composition grouping.
- CONFIRMED: `src/stores/__tests__/storage.spec.ts` covers reset/logout related state.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered `Settings.vue` tests.
- CONFIRMED: No tests for composition normalization/building.
- CONFIRMED: No tests for retry login UI behavior or credential-clearing toast.

## Product Questions
- UNCLEAR: Should zero-valued generated composition cells be persisted or omitted for compactness?
- UNCLEAR: Should retry-login failures provide provider-specific remediation text?
