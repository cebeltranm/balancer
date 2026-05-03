# Feature: Balance

## Goal
- CONFIRMED: Show calculated assets, liabilities, and net worth over recent periods.

## Current Implemented Behavior
- CONFIRMED: `/balance` maps to `src/views/Balance.vue` and requires authentication.
- CONFIRMED: The view displays only when `storageStore.status.authenticated` is true.
- CONFIRMED: The table groups balances into Assets and Liabilities, with categories for cash, receivables, investments, fixed assets, and liabilities.
- CONFIRMED: It displays recent periods and percentage change columns.
- CONFIRMED: Values are converted to the injected global currency using `valuesStore.getValue()`.
- CONFIRMED: `useBalanceStore()` loads yearly `balance_<year>.json`, groups data by month/quarter/year, ensures current month balance, and recalculates balances from transactions/accounts/values.

## User Flows
- CONFIRMED: Select month, quarter, or year period.
- CONFIRMED: View grouped balances and net worth footer.
- CONFIRMED: Compare current values with prior periods through percentage columns.

## Inputs And Outputs
- CONFIRMED: Inputs are selected period, account groups, balance snapshots, values rates, transactions for recalculation, and account metadata.
- CONFIRMED: Outputs are grouped table rows, totals, and persisted balance snapshots when recalculation saves.

## Data Files Read/Written
- CONFIRMED: Reads `balance_<year>.json`, `accounts.json`, `values_<year>.json`, and `transactions_<year>_<month>.json`.
- CONFIRMED: Writes `balance_<year>.json` through IndexedDB cache when recalculation saves.

## Store / Helper / Component Files Involved
- CONFIRMED: `src/views/Balance.vue`, `src/stores/balance.ts`, `src/stores/accounts.ts`, `src/stores/values.ts`, `src/stores/transactions.ts`, `src/stores/storage.ts`, `src/helpers/groupData.ts`, `src/helpers/options.ts`.

## Error Handling
- CONFIRMED: Missing yearly balance data returns `null` from `loadBalanceForYear()` and can trigger recalculation for current month.
- CONFIRMED: Missing transaction data is handled as no changes in recalculation.
- UNCLEAR: No user-facing error is shown for stale, missing, or failed balance loads.

## Edge Cases
- CONFIRMED: Expense and income accounts are summed across grouped periods, while asset/liability accounts use the latest value in the grouped period.
- CONFIRMED: Investment flow fields are summed across grouped periods.
- CONFIRMED: ETF/Stock/Crypto units use latest grouped units.
- CONFIRMED: Recalculation crosses year boundaries by reading previous December when recalculating January.

## Acceptance Criteria
- CONFIRMED: GIVEN at least one account already has a current-month balance, WHEN `ensureCurrentMonthBalance()` runs, THEN it does not recalculate the current month.
- CONFIRMED: GIVEN no account has a current-month balance, WHEN `ensureCurrentMonthBalance()` runs, THEN the current month is recalculated from transactions, values, and prior balances.
- CONFIRMED: GIVEN an earlier month is recalculated, WHEN the month is before the current month, THEN future months are recalculated through the current month.
- CONFIRMED: GIVEN balance data is saved, WHEN `balance_<year>.json` is staged, THEN each saved entry includes `value`, `expenses`, `in`, `out`, `in_local`, `out_local`, and `units`.
- UNCLEAR: The product response for stale or failed balance loads is not specified.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/balance.spec.ts` covers grouping, investment field aggregation, current-month recalculation, and current-month no-op.
- CONFIRMED: `src/helpers/__tests__/groupData.spec.ts` covers month and quarter grouping.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered `Balance.vue` tests.
- CONFIRMED: No tests for full recalculation formulas across all account types.
- CONFIRMED: No tests for recursive multi-month recalculation side effects.

## Product Questions
- UNCLEAR: Should users be able to force recalculation when balances look stale?
- UNCLEAR: What warning should appear when required values or transaction files are missing during recalculation?
