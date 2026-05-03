# Feature: Values

## Goal
- CONFIRMED: Maintain exchange rates and asset prices used for conversions, asset valuation, and balance recalculation.

## Current Implemented Behavior
- CONFIRMED: `/settings/values` maps to `src/views/Values.vue`.
- CONFIRMED: The view lists required non-USD currency rates and active investment/fixed-asset values for the selected month.
- CONFIRMED: Users can edit values inline, save the selected month, and trigger external value sync.
- CONFIRMED: Saving writes the selected month into `values_<year>.json` via IndexedDB cache with `to_sync: true`.
- CONFIRMED: Saving values also triggers `balanceStore.recalculateBalance(year, month, true)`.
- CONFIRMED: Value lookup supports direct rates, inverse rates, fallback to prior months, explicit zero values, and USD cross-rates.
- CONFIRMED: Startup copies previous-month values into a missing current month when requested.
- CONFIRMED: Sync can fetch currency rates from fawazahmed0 currency APIs, crypto values in BTC, and stock prices from AlphaVantage, MarketStack, or RapidAPI/Yahoo Finance depending on `config.stock_api`.

## User Flows
- CONFIRMED: Select month period and inspect current rates/prices with month-over-month and year-over-year deltas.
- CONFIRMED: Edit a non-negative value, mark the row pending, and save.
- CONFIRMED: Click sync to attempt external currency/crypto/stock updates.
- CONFIRMED: Filter the table by entity or type.

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
- UNCLEAR: External API errors are not surfaced to the user.
- UNCLEAR: `storageStore.executeInSync()` wraps sync but the values view does not display per-provider failure details.

## Edge Cases
- CONFIRMED: BTC supports up to 10 decimal places in inputs.
- CONFIRMED: Historical currency API URL format changes before March 2024 vs March 2024 and later.
- CONFIRMED: Stock API sync only fetches live stock prices for the current selected month for AlphaVantage and RapidAPI paths.
- CONFIRMED: `getValue()` searches previous months only up to `maxLevels`.

## Acceptance Criteria
- CONFIRMED: GIVEN the source and target asset/currency are the same, WHEN `getValue()` is called, THEN it returns `1`.
- CONFIRMED: GIVEN direct, inverse, or USD-cross rates exist within the permitted fallback window, WHEN `getValue()` is called, THEN it returns the expected finite conversion value.
- CONFIRMED: GIVEN an explicit zero value exists, WHEN `getValue()` is called, THEN it returns zero and does not fall back to prior months.
- CONFIRMED: GIVEN the user edits a value to a negative number or unchanged value, WHEN the edit completes, THEN no pending save is created for that row.
- CONFIRMED: GIVEN the user saves valid selected-month values, WHEN save succeeds, THEN `values_<year>.json` is staged with `to_sync: true` and balances are recalculated from that month.
- UNCLEAR: The expected user-facing result for external provider failures is not specified.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/values.spec.ts` covers value lookup, zero handling, load/save, join values, and current-month bootstrap.
- CONFIRMED: `src/stores/__tests__/balance.spec.ts` covers value-dependent balance recalculation paths indirectly.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered `Values.vue` tests for editing, filtering, pending class, save, or external sync.
- CONFIRMED: No tests mock external currency/stock API responses.
- CONFIRMED: No test verifies balance recalculation is called by the values view save action.

## Product Questions
- UNCLEAR: Should external sync failures be shown per row, per provider, or as a single generic error?
- UNCLEAR: What fallback window should the product guarantee for stale rates/prices?
