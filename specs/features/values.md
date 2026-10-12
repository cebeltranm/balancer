# Feature: Values

## Goal
- CONFIRMED: Maintain exchange rates and asset prices used for conversions, asset valuation, and balance recalculation.

## Observed Implementation
- CONFIRMED: `/settings/values` maps to `src/views/Values.vue`.
- CONFIRMED: The view lists required non-USD currency rates and active investment/fixed-asset values for the selected month.
- CONFIRMED: Users can edit values inline, save the selected month, and trigger external value sync.
- CONFIRMED: Saving writes the selected month into `values_<year>.json` via IndexedDB cache with `to_sync: true`.
- CONFIRMED: Saving values also triggers `balanceStore.recalculateBalance(year, month, true)`.
- CONFIRMED: Value lookup supports direct rates, inverse rates, fallback to prior months, explicit zero values, and USD cross-rates.
- CONFIRMED: Startup copies previous-month values into a missing current month when requested.
- CONFIRMED: Sync can fetch currency rates from fawazahmed0 currency APIs, crypto values in BTC, and stock prices from AlphaVantage, MarketStack, or RapidAPI/Yahoo Finance depending on `config.stock_api`.
- CONFIRMED: Active MXN accounts produce a USD-to-MXN exchange-rate row that can be edited, synchronized, and saved with the `mxn` currency code.
- CONFIRMED: RT-012 is implemented: external value sync failures are shown as one generic user-facing error.
- CONFIRMED: RT-040 is implemented: `Values.vue` binds the table to `sortedValues`, a sorted copy of the rows (`compareRows()`): Currency rows by currency code, then rows with an entity by entity, name, id, then rows without an entity by name, id, using `localeCompare` with `{ sensitivity: "base", numeric: true }`. `values` itself, `save()`, sync, and `activeAccounts()` keep their original order. The Entity and Type filter options are built from `sortedValues`. No column is sortable.
- CONFIRMED: Contract status: satisfied for RT-011, RT-012, RT-013, and RT-040 (row order).

## Product Contract
- REQUIRED (RT-012): Any external value sync failure shows one generic error, not per row or per provider.
- REQUIRED (RT-013): Value lookup falls back to prior months only up to `maxLevels` (default 3; non-USD cross-rate legs 2), with no warning solely because a prior-month value was used.
- REQUIRED (RT-011): Missing rates are never silently coerced to zero; an explicit `0` is valid data.
- RESOLVED (RT-040): The Values table has one fixed default row order. Currency rows form a block at the top, ordered by currency code. Investment and fixed-asset rows follow, ordered by `entity`, then `name`, then account `id`. Accounts with no entity (missing or blank) come after all accounts that have an entity, ordered by `name`, then `id`.
- RESOLVED (RT-040): The shared comparison rules are in `specs/architecture.md` List Ordering. Text comparison uses `localeCompare` with `{ sensitivity: "base", numeric: true }`, so case and accents are ignored and digit runs compare numerically ("Fund 2" before "Fund 10"). `id` breaks ties so the order is stable.
- RESOLVED (RT-040): Ordering is display-only. It does not change `accounts.json`, `activeAccounts()` or its other callers, the keys written to `values_<year>.json`, or sync behavior. Hidden or inactive accounts stay excluded as before. Editing a value never reorders rows. There are no user-sortable columns.
- RESOLVED (RT-040): The Entity and Type filter option lists are built from the ordered rows, so Entity options are alphabetical by the same comparison. Type options keep first-appearance order in the ordered rows.

## User Flows
- CONFIRMED: Select month period and inspect current rates/prices with month-over-month and year-over-year deltas.
- CONFIRMED: Edit a non-negative value, mark the row pending, and save.
- CONFIRMED: Click sync to attempt external currency/crypto/stock updates.
- CONFIRMED: Filter the table by entity or type.
- RESOLVED (RT-040): Rows appear in the fixed order defined in the Product Contract.

## Inputs And Outputs
- CONFIRMED: Inputs are account metadata, existing yearly values, selected period, external API responses, and stock API settings.
- CONFIRMED: Outputs are monthly value records, pending sync state, recalculated balances, and table deltas.

## Data Files Read/Written
- CONFIRMED: Reads `values_<year>.json`, `accounts.json`, `config.json`, and `balance_<year>.json`.
- CONFIRMED: Writes `values_<year>.json` and stages `balance_<year>.json` recalculation output.

## Store / Helper / Component Files Involved
- CONFIRMED: `src/views/Values.vue`, `src/stores/values.ts`, `src/stores/accounts.ts`, `src/stores/config.ts`, `src/stores/storage.ts`, `src/stores/balance.ts`, `src/helpers/options.ts`.

## Error Handling
- CONFIRMED: Inline edits are ignored unless the new value is `>= 0` and changed.
- CONFIRMED: External sync only updates rows when HTTP status is 200 and expected response fields exist.
- CONFIRMED: RT-012 requires one generic user-facing error when any external value sync provider fails.
- CONFIRMED: RT-012 does not require per-row or per-provider failure details.
- CONFIRMED: Current code satisfies RT-012 by aggregating failed external value sync results and emitting one generic user-facing error.

## Edge Cases
- CONFIRMED: BTC supports up to 10 decimal places in inputs.
- CONFIRMED: Historical currency API URL format changes before March 2024 vs March 2024 and later.
- CONFIRMED: Stock API sync only fetches live stock prices for the current selected month for AlphaVantage and RapidAPI paths.
- CONFIRMED: `getValue()` searches previous months only up to `maxLevels`.
- CONFIRMED: RT-013 is implemented in code: the fallback window is the current implementation rule, and the app does not show a warning only because a selected period uses a prior-month value.

## Acceptance Criteria
- CONFIRMED: GIVEN the source and target asset/currency are the same, WHEN `getValue()` is called, THEN it returns `1`.
- CONFIRMED: GIVEN direct, inverse, or USD-cross rates exist within the permitted fallback window, WHEN `getValue()` is called, THEN it returns the expected finite conversion value.
- CONFIRMED: GIVEN an explicit zero value exists, WHEN `getValue()` is called, THEN it returns zero and does not fall back to prior months.
- CONFIRMED: GIVEN no direct or inverse value exists in the selected month, WHEN a matching value exists within the `maxLevels` fallback window, THEN `getValue()` returns that prior-month value without requiring a user-facing freshness warning.
- CONFIRMED: GIVEN no direct or inverse value exists within the `maxLevels` fallback window, WHEN `getValue()` is called, THEN it returns `0`.
- CONFIRMED: GIVEN a non-USD to non-USD conversion requires a USD cross-rate, WHEN both USD legs are available within their permitted fallback windows, THEN `getValue()` returns the finite cross-rate result.
- CONFIRMED: GIVEN a selected period uses a prior-month value from the permitted fallback window, WHEN reports or values are rendered, THEN no warning is shown solely for that fallback.
- CONFIRMED: GIVEN the user edits a value to a negative number or unchanged value, WHEN the edit completes, THEN no pending save is created for that row.
- CONFIRMED: GIVEN the user saves valid selected-month values, WHEN save succeeds, THEN `values_<year>.json` is staged with `to_sync: true` and balances are recalculated from that month.
- CONFIRMED: GIVEN the user triggers external value sync, WHEN any currency, crypto, or stock provider request rejects, THEN the values view shows one generic external value sync error.
- CONFIRMED: GIVEN the user triggers external value sync, WHEN any external provider returns a non-200 response, THEN the values view shows one generic external value sync error.
- CONFIRMED: GIVEN the user triggers external value sync, WHEN any external provider returns a 200 response with missing or malformed expected data, THEN the values view shows one generic external value sync error.
- CONFIRMED: GIVEN multiple providers fail during one external value sync attempt, THEN the values view shows only one generic error and does not expose per-row or per-provider failure details.
- CONFIRMED: GIVEN an active MXN account and a successful currency-provider response containing `usd.mxn`, WHEN the user synchronizes and saves values, THEN the MXN rate is persisted as `{ usd: { mxn: number } }`.
- RESOLVED (RT-040): GIVEN active accounts for currencies MXN and COP and several investment accounts, WHEN the values view renders, THEN the Currency rows appear first, ordered by currency code (COP before MXN), followed by the investment and fixed-asset rows.
- RESOLVED (RT-040): GIVEN investment accounts with entities "Zeta Bank" and "alpha bank" (accounts.json order: Zeta first), WHEN rendered, THEN "alpha bank" rows come before "Zeta Bank" rows, and within one entity rows are ordered by name.
- RESOLVED (RT-040): GIVEN accounts whose entity or name differ only by case or accents ("Álamo" and "alamo"), WHEN rendered, THEN they compare as equal and `id` decides their order.
- RESOLVED (RT-040): GIVEN two accounts of the same entity named "Fund 2" and "Fund 10", WHEN rendered, THEN "Fund 2" appears before "Fund 10".
- RESOLVED (RT-040): GIVEN accounts with a missing or blank entity, WHEN rendered, THEN they appear after every account that has an entity, ordered by name.
- RESOLVED (RT-040): GIVEN two accounts with the same entity and name, WHEN rendered, THEN the one with the lower `id` appears first on every render.
- RESOLVED (RT-040): GIVEN the user edits a value, WHEN the edit completes, THEN row order is unchanged.
- RESOLVED (RT-040): GIVEN rows are displayed in sorted order, WHEN the user saves, THEN the persisted values contain the same ids and numbers as before, and the Entity filter options are in alphabetical order.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/values.spec.ts` covers value lookup, zero handling, load/save, join values, and current-month bootstrap.
- CONFIRMED: `src/stores/__tests__/balance.spec.ts` covers value-dependent balance recalculation paths indirectly.
- CONFIRMED: `src/views/__tests__/ValuesRowOrder.spec.ts` covers RT-040 row order (see Missing Tests / Coverage Gaps).
- CONFIRMED: `src/views/__tests__/Values.spec.ts` covers generic external value sync errors for rejected provider requests, non-200 responses, malformed payloads, and multiple failures, plus successful MXN rate synchronization and persistence.

## Missing Tests / Coverage Gaps
- CONFIRMED: Required component, integration, and manual coverage levels for this feature are defined in `specs/testing-strategy.md` (RT-031); keep both in sync when closing a gap.
- CONFIRMED: `src/stores/__tests__/values.spec.ts` verifies the default fallback window returns prior-month values within the window and `0` outside it.
- CONFIRMED: `src/stores/__tests__/values.spec.ts` verifies USD cross-rate legs use bounded fallback windows.
- CONFIRMED: `src/views/__tests__/Values.spec.ts` verifies prior-month fallback does not show a warning by itself.
- CONFIRMED: No rendered `Values.vue` tests for manual editing, filtering, or pending-row styling; successful MXN external sync and save are covered.
- CONFIRMED: No test verifies balance recalculation is called by the values view save action.
- CONFIRMED (RT-040): `src/views/__tests__/ValuesRowOrder.spec.ts` verifies the Currency block by code, entity then name then id, no-entity rows last, case/accent/numeric collation, id tie-break, order unchanged by an edit, unchanged saved payload, and Entity/Type filter options built from the ordered rows.

## Product Questions
- RESOLVED: RT-012 external value sync failures should be shown as a single generic error, not per row or per provider.
- RESOLVED: RT-040 Values rows use one fixed default order (Currency block by code, then entity, then name, then id; no-entity rows last), compared with `localeCompare(..., { sensitivity: "base", numeric: true })`.
- RESOLVED: RT-013 values fallback window uses the current implementation rule: `getValue()` searches the selected month and prior months up to `maxLevels` attempts, with the default `maxLevels = 3`; non-USD cross-rate legs use `maxLevels = 2`. The app must not show a warning solely because the selected period used a prior-month value.
