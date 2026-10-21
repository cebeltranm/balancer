# Feature: Investments

## Goal
- CONFIRMED: Analyze investment accounts by category, asset class, region, type, risk, currency, and performance.

## Observed Implementation
- CONFIRMED: `/investments` maps to `src/views/portafolio/index.vue` and requires authentication.
- CONFIRMED: Display types are table, pie, and bar.
- CONFIRMED: Pie grouping options are ByAssetClass, ByRegion, ByCategory, ByType, ByRisk, and ByCurrency.
- CONFIRMED: Bar display can filter selected investment accounts.
- CONFIRMED: Asset-class and region grouping use account `class` allocation weights and expected target composition from `config.inv_composition`.
- CONFIRMED: `useTotalByCategory()` converts child values and investment flow fields into the global currency and computes gain/loss-like fields `gp` and `gp_value`.
- CONFIRMED: `accountsGrupedByAttribute()` groups investments by a selected account attribute with a default fallback.
- CONFIRMED: RT-041 is implemented: `accountsGroupBy` in `src/views/portafolio/index.vue` passes the table-display groups through `sortTreeByName()` (`src/helpers/ordering.ts`), a sorted copy: categories and entity groups first, then accounts, each by name, at every level. Pie and bar keep the order from `Object.keys(accounts.json)` through `accountsGroupByCategories()` and `useTotalByCategory()`.
- CONFIRMED: Contract status: satisfied for RT-017 and RT-011; its tests are in place (see Missing Tests). RT-041 (table order): satisfied.

## Product Contract
- REQUIRED (RT-017): Investment accounts require a class allocation; legacy accounts with missing allocation are grouped under "Unknown" with a visible warning instead of being dropped.
- RESOLVED (RT-041): In the table display only, entities and categories come first, sorted by group name, and accounts follow, sorted by account `name`, at every nesting level. Accounts with no entity therefore come after all entity groups. Ordering follows `specs/architecture.md` List Ordering: `localeCompare` with `{ sensitivity: "base", numeric: true }`, empty names last, ties by id.
- RESOLVED (RT-041): The order is display-only. It does not change `accounts.json`, `activeAccounts()`, `accountsGroupByCategories()`, totals, the bar series, or sync. Hidden or inactive accounts stay excluded. The pie display (all groupings) and the bar display keep their current order.
- REQUIRED (RT-011): Missing exchange rates produce partial totals with a visible missing-rate indicator naming the affected currencies/accounts; an explicit `0` rate is valid data.

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
- REQUIRED: New/edited investment accounts must have a class allocation that sums to 100%; account setup blocks save otherwise (see RT-017 and `specs/features/accounts.md`).
- IMPLEMENTED (RT-017 decision): Legacy investment accounts saved before allocation was enforced (missing or empty `class`) are not silently dropped from ByAssetClass/ByRegion analytics. They are grouped under an "Unknown" asset class/region bucket (`src/views/portafolio/index.vue`'s `addToUnknownBucket()`), and `pie.vue` displays a visible warning naming the affected accounts, next to the existing missing-rate indicator.
- REQUIRED: When an investment summary cannot convert an account/category currency because an exchange rate is missing, the UI must display a partial total and a visible missing-rate indicator listing the affected currencies/accounts.
- IMPLEMENTED: Investment summaries preserve partial totals and display missing-rate indicators from `useTotalByCategory()` metadata when conversion rates are unavailable.

## Edge Cases
- CONFIRMED: Percentage allocation on accounts prorates values and flow fields.
- CONFIRMED: When display type is not table, investment labels prefer symbol/name variants for compact display.
- CONFIRMED: Bar display loads up to 11 years of balance/value files.
- CONFIRMED: Missing exchange rates must not be silently coerced to zero in investment UI summaries; unconverted account/category amounts are omitted from the displayed partial converted total and identified by the missing-rate indicator.

## Acceptance Criteria
- CONFIRMED: GIVEN the user opens `/investments` without local authentication, WHEN the router auth check runs, THEN the authentication dialog is requested before sensitive investment data is shown.
- CONFIRMED: GIVEN config composition contains expected weights, WHEN grouping by asset class or region, THEN rows include expected values derived from current totals and config weights.
- CONFIRMED: GIVEN an investment account has no `risk`, WHEN grouping by risk, THEN it is grouped under fallback risk `3`.
- CONFIRMED: GIVEN an investment account lacks another selected grouping attribute, WHEN grouping by that attribute, THEN it is grouped under the empty-string fallback.
- IMPLEMENTED (RT-017 decision): GIVEN an investment account has no `class` allocation (or an empty one) while grouping ByAssetClass or ByRegion, WHEN portfolio analytics render, THEN that account's value is included under an "Unknown" asset-class/region bucket instead of being dropped from totals.
- IMPLEMENTED (RT-017 decision): GIVEN one or more accounts are grouped under "Unknown" in ByAssetClass or ByRegion view, WHEN the portfolio summary renders, THEN the UI displays a visible warning naming the affected accounts, similar in presentation to the existing missing-rate indicator.
- REQUIRED (RT-017 decision, IMPLEMENTED): GIVEN a new or edited investment account, WHEN the user attempts to save with no class allocation entered, THEN save is blocked the same as an allocation that does not sum to 100% (see `specs/features/accounts.md` acceptance criteria).
- REQUIRED: GIVEN an investment account or grouped category uses a non-global currency and no exchange rate is available for the displayed period, WHEN the table, treemap, or bar summary renders, THEN the converted total is shown as a partial total and the UI displays a missing-rate indicator naming the affected currency and account/category.
- RESOLVED (RT-041): GIVEN accounts "Zeta" and "alpha" in one entity (accounts.json order: Zeta first), WHEN the table renders, THEN "alpha" comes before "Zeta".
- RESOLVED (RT-041): GIVEN entities "Zeta Bank" and "alpha bank", WHEN the table renders, THEN the "alpha bank" group comes before the "Zeta Bank" group.
- RESOLVED (RT-041): GIVEN accounts named "Fund 10" and "Fund 2", WHEN the table renders, THEN "Fund 2" comes first.
- RESOLVED (RT-041): GIVEN accounts whose names differ only by case or accents ("Álamo" and "alamo"), WHEN the table renders, THEN they compare as equal and the id decides.
- RESOLVED (RT-041): GIVEN an account with an empty name, WHEN the table renders, THEN it comes after named accounts in its group, ordered by id.
- RESOLVED (RT-041): GIVEN accounts with no entity and entity groups, WHEN the table renders, THEN every entity group comes before the no-entity accounts, which are sorted by name then id.
- RESOLVED (RT-041): GIVEN nested `category` groups, WHEN the table renders, THEN sub-categories come first, sorted by name, then accounts, sorted by name.
- RESOLVED (RT-041): GIVEN accounts in different currencies in one group, WHEN the table renders, THEN they sort by name only and are not merged or converted by the sort.
- RESOLVED (RT-041): GIVEN the table is sorted, WHEN totals are computed, THEN they equal the totals of the unsorted data, and the pie display keeps its original order.
- REQUIRED: GIVEN a conversion rate or asset value is explicitly stored as `0`, WHEN investment summaries are rendered, THEN the zero value is treated as present data and is not reported as missing.

## Existing Tests Related To This Feature
- CONFIRMED (RT-041): `src/views/__tests__/PortfolioRowOrder.spec.ts` and `src/helpers/__tests__/ordering.spec.ts` cover the table order.
- CONFIRMED: `src/helpers/__tests__/investments.spec.ts` covers nested expected mapping and grouping by attribute.
- CONFIRMED: `src/stores/__tests__/config.spec.ts` covers composition grouping by asset class and region.
- CONFIRMED: `src/stores/__tests__/balance.spec.ts` covers investment flow aggregation.
- CONFIRMED: `src/composables/__tests__/totalByCategory.spec.ts` covers partial converted totals, missing-rate metadata, and explicit zero rates.
- IMPLEMENTED (RT-017): `src/views/__tests__/PortfolioUnknownAllocation.spec.ts` covers the "Unknown" grouping and warning for legacy accounts with missing class allocation in the ByAssetClass pie view.

## Missing Tests / Coverage Gaps
- CONFIRMED (RT-041): `src/views/__tests__/PortfolioRowOrder.spec.ts` verifies groups before accounts, no-entity accounts last, case/accent/numeric collation, id tie-break, empty names last, nested categories, unchanged total, and unchanged pie order. `src/helpers/__tests__/ordering.spec.ts` covers the comparator and tree sort.
- CONFIRMED: Required component, integration, and manual coverage levels for this feature are defined in `specs/testing-strategy.md` (RT-031); keep both in sync when closing a gap.
- CONFIRMED: Rendered portfolio coverage: the Unknown-allocation case for ByAssetClass and ByRegion in the pie display (`PortfolioUnknownAllocation.spec.ts`), table order (`PortfolioRowOrder.spec.ts`), and missing-rate indicators in the table and bar children (`PortfolioMissingRates.spec.ts`). Other groupings (ByRisk, ByType, ByCurrency) and the chart rendering itself are not rendered in tests.
- CONFIRMED: `useTotalByCategory()` missing-rate conversion behavior is covered; broader performance calculations still need coverage.
- CONFIRMED: `useTotalByCategory()` tests prove missing conversion rates return partial converted totals, preserve missing-rate metadata, and do not flag explicit zero rates as missing.
- CONFIRMED: Portfolio table, treemap, and bar views render missing-rate indicators from summary metadata. `src/views/__tests__/PortfolioMissingRates.spec.ts` renders `table.vue` (account row and footer total) and `bar.vue` with metadata naming `eur->usd (eur_fund)` and asserts the indicator is shown there and absent when nothing is missing. The pie/treemap child is not covered by that file.
- IMPLEMENTED (RT-017): `src/views/__tests__/PortfolioUnknownAllocation.spec.ts` mounts the portfolio view (ByAssetClass, pie display) with a legacy account that has no `class` allocation and asserts its value is grouped under "Unknown" rather than dropped, and that its account id is present in the rendered output alongside Unknown/unallocated wording.
- IMPLEMENTED (RT-017): `PortfolioUnknownAllocation.spec.ts` also covers ByRegion (legacy account under Unknown with the warning naming it; allocated account still under its region) and asserts that, for both ByAssetClass and ByRegion, a fully allocated account produces no Unknown bucket and no warning. This is a component-level test because the Unknown bucket is built in `src/views/portafolio/index.vue`, not in `src/helpers/investments.ts`.
- IMPLEMENTED (RT-017): `src/views/__tests__/AccountsClassAllocation.spec.ts` asserts an investment account whose allocation sums to something other than 100% shows the allocation error and cannot be saved.

## Product Questions
- RESOLVED (RT-041): In what order does the Investments table list entity groups, categories, and accounts? Decision: categories and entity groups first, then accounts, each by name (case/accent-insensitive, numeric-aware, empty last, id tie-break); table display only.
- RESOLVED (RT-017): Should investment accounts with missing class allocation be blocked, excluded, or grouped as unknown? Decision: enforce required allocation in account setup for investment accounts going forward (implemented, see `specs/features/accounts.md`); analytics group legacy accounts with missing/empty allocation under an "Unknown" bucket with a visible warning, rather than excluding them (implemented in `src/views/portafolio/index.vue` and `src/views/portafolio/pie.vue`).
