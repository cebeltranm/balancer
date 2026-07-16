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
- CONFIRMED: RT-012 is implemented: external value sync failures are shown as one generic user-facing error.

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
- CONFIRMED: RT-012 requires one generic user-facing error when any external value sync provider fails.
- CONFIRMED: RT-012 does not require per-row or per-provider failure details.
- CONFIRMED: Current code satisfies RT-012 by aggregating failed external value sync results and emitting one generic user-facing error.

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
- CONFIRMED: GIVEN the user triggers external value sync, WHEN any currency, crypto, or stock provider request rejects, THEN the values view shows one generic external value sync error.
- CONFIRMED: GIVEN the user triggers external value sync, WHEN any external provider returns a non-200 response, THEN the values view shows one generic external value sync error.
- CONFIRMED: GIVEN the user triggers external value sync, WHEN any external provider returns a 200 response with missing or malformed expected data, THEN the values view shows one generic external value sync error.
- CONFIRMED: GIVEN multiple providers fail during one external value sync attempt, THEN the values view shows only one generic error and does not expose per-row or per-provider failure details.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/values.spec.ts` covers value lookup, zero handling, load/save, join values, and current-month bootstrap.
- CONFIRMED: `src/stores/__tests__/balance.spec.ts` covers value-dependent balance recalculation paths indirectly.
- CONFIRMED: `src/views/__tests__/Values.spec.ts` covers generic external value sync errors for rejected provider requests, non-200 responses, malformed payloads, and multiple failures.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered `Values.vue` tests for editing, filtering, pending class, save, or successful external sync.
- CONFIRMED: No test verifies balance recalculation is called by the values view save action.

## Product Questions
- RESOLVED: RT-012 external value sync failures should be shown as a single generic error, not per row or per provider.
- UNCLEAR: What fallback window should the product guarantee for stale rates/prices?
