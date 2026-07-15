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
- CONFIRMED: Authenticated users can force recalculation from the selected period, and missing source data is surfaced as a warning after recalculation.

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
- REQUIRED: Missing source data during balance recalculation must produce a user-facing warning that identifies the affected source, such as missing transaction files, missing values files, or missing asset/currency rates needed to calculate investment and converted balances.
- REQUIRED: Missing value/rate warnings must ignore accounts whose `hideSince` date makes them inactive for the recalculated month.
- REQUIRED: A present value/rate entry of `0` is valid data and must not be treated as missing source data.
- REQUIRED: Stale or suspect balance snapshots must be recoverable by an authenticated user through a force-recalculate action.

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
- REQUIRED: GIVEN an authenticated user is viewing balances, WHEN they choose force recalculation for the selected balance period, THEN the app rebuilds derived balances from source accounts, transactions, values, and prior balances and stages the affected `balance_<year>.json` cache for sync.
- REQUIRED: GIVEN an authenticated user force-recalculates a period whose month already has stored balance data, WHEN recalculation completes, THEN the stored derived balance is replaced by the newly calculated result instead of being skipped as fresh.
- REQUIRED: GIVEN recalculation needs a transaction file, values file, or exchange/asset value that is missing, WHEN recalculation completes, THEN the app shows a warning that totals may be incomplete and identifies the affected source data.
- REQUIRED: GIVEN a hidden account no longer needs values for the recalculated month, WHEN its value/rate source is missing, THEN recalculation does not warn for that hidden account.
- REQUIRED: GIVEN a required account value or rate exists with value `0`, WHEN recalculation completes, THEN the app does not warn that the value or rate is missing.
- REQUIRED: GIVEN a derived balance cache is missing or stale, WHEN required source data is available, THEN rebuilding the cache must not require manual editing of `balance_<year>.json`.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/balance.spec.ts` covers grouping, investment field aggregation, current-month recalculation, and current-month no-op.
- CONFIRMED: `src/stores/__tests__/balance.spec.ts` covers forced recalculation replacing an existing month balance, staging the derived cache for sync, warning metadata for missing source data, ignoring hidden accounts for missing value/rate warnings, and accepting explicit zero values.
- CONFIRMED: `src/views/__tests__/Balance.spec.ts` covers the authenticated force-recalculate action, the unauthenticated absence of that action, and warning display after recalculation with missing source data.
- CONFIRMED: `src/helpers/__tests__/groupData.spec.ts` covers month and quarter grouping.

## Missing Tests / Coverage Gaps
- CONFIRMED: Rendered `Balance.vue` tests now cover RT-010 force recalculation and warning behavior.
- CONFIRMED: No tests for full recalculation formulas across all account types.
- CONFIRMED: No tests for recursive multi-month recalculation side effects.

## Product Questions
- RESOLVED: Balance snapshots are derived cache, not durable financial records. Authenticated users must be able to force recalculation when balances look stale.
- RESOLVED: Required source data missing during recalculation must be surfaced as a warning that identifies the affected transaction, values, or rate/value source and explains that resulting balances may be incomplete.
