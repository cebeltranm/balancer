# Feature: Investments

## Goal
- CONFIRMED: Analyze investment accounts by category, asset class, region, type, risk, currency, and performance.

## Current Implemented Behavior
- CONFIRMED: `/investments` maps to `src/views/portafolio/index.vue` and requires authentication.
- CONFIRMED: Display types are table, pie, and bar.
- CONFIRMED: Pie grouping options are ByAssetClass, ByRegion, ByCategory, ByType, ByRisk, and ByCurrency.
- CONFIRMED: Bar display can filter selected investment accounts.
- CONFIRMED: Asset-class and region grouping use account `class` allocation weights and expected target composition from `config.inv_composition`.
- CONFIRMED: `useTotalByCategory()` converts child values and investment flow fields into the global currency and computes gain/loss-like fields `gp` and `gp_value`.
- CONFIRMED: `accountsGrupedByAttribute()` groups investments by a selected account attribute with a default fallback.

## User Flows
- CONFIRMED: Select period and display type.
- CONFIRMED: In pie display, choose grouping mode.
- CONFIRMED: In bar display, select investment accounts to include.
- CONFIRMED: View totals and child breakdowns in table/pie/bar child components.

## Inputs And Outputs
- CONFIRMED: Inputs are investment accounts, balance snapshots, value rates, selected period/display/grouping, and config target composition.
- CONFIRMED: Outputs are nested category structures with values, flows, expected composition, codes/logos, and performance metrics.

## Data Files Read/Written
- CONFIRMED: Reads `accounts.json`, `balance_<year>.json`, `values_<year>.json`, and `config.json`.
- CONFIRMED: Writes no files.

## Store / Helper / Component Files Involved
- CONFIRMED: `src/views/portafolio/index.vue`, `src/views/portafolio/table.vue`, `src/views/portafolio/pie.vue`, `src/views/portafolio/bar.vue`, `src/composables/totalByCategory.ts`, `src/helpers/investments.ts`, `src/stores/accounts.ts`, `src/stores/balance.ts`, `src/stores/config.ts`, `src/stores/values.ts`.

## Error Handling
- CONFIRMED: Missing investment grouping data generally returns empty arrays.
- UNCLEAR: No explicit UI error is shown for missing account class allocation or missing expected composition.

## Edge Cases
- CONFIRMED: Percentage allocation on accounts prorates values and flow fields.
- CONFIRMED: When display type is not table, investment labels prefer symbol/name variants for compact display.
- CONFIRMED: Bar display loads up to 11 years of balance/value files.
- INFERRED: Missing exchange rates can understate converted totals.

## Acceptance Criteria
- CONFIRMED: GIVEN the user opens `/investments` without local authentication, WHEN the router auth check runs, THEN the authentication dialog is requested before sensitive investment data is shown.
- CONFIRMED: GIVEN config composition contains expected weights, WHEN grouping by asset class or region, THEN rows include expected values derived from current totals and config weights.
- CONFIRMED: GIVEN an investment account has no `risk`, WHEN grouping by risk, THEN it is grouped under fallback risk `3`.
- CONFIRMED: GIVEN an investment account lacks another selected grouping attribute, WHEN grouping by that attribute, THEN it is grouped under the empty-string fallback.
- UNCLEAR: The product response for missing class allocation, expected composition, or conversion rates is not specified.

## Existing Tests Related To This Feature
- CONFIRMED: `src/helpers/__tests__/investments.spec.ts` covers nested expected mapping and grouping by attribute.
- CONFIRMED: `src/stores/__tests__/config.spec.ts` covers composition grouping by asset class and region.
- CONFIRMED: `src/stores/__tests__/balance.spec.ts` covers investment flow aggregation.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered portfolio view tests.
- CONFIRMED: No tests for `useTotalByCategory()` conversion/performance calculations.
- CONFIRMED: No tests for chart/table child component rendering.

## Product Questions
- UNCLEAR: Should investment accounts with missing class allocations be blocked in account setup, excluded from analytics, or grouped as unknown?
- UNCLEAR: Should portfolio analytics show partial totals when exchange rates are missing?
