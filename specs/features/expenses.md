# Feature: Expenses

## Goal
- CONFIRMED: Report expense and income activity by account category over configurable periods.

## Current Implemented Behavior
- CONFIRMED: `/expenses` maps to `src/views/Expenses.vue` and is excluded from router authentication prompting.
- CONFIRMED: Users can switch between table, treemap pie-like view, and stacked bar view.
- CONFIRMED: Table view shows the latest five periods, current value, percent change vs prior periods, budget progress, and read-only budget comments.
- CONFIRMED: Authenticated users see both income and expense groups; unauthenticated users see only expenses.
- CONFIRMED: Values and budgets are converted to the injected global currency when category children use other currencies.
- CONFIRMED: Bar view can filter to a top-level expense category and loads up to 10 prior years of balances when selected.

## User Flows
- CONFIRMED: Select month/quarter/year period.
- CONFIRMED: Switch between table, treemap, and bar chart displays.
- CONFIRMED: In bar display, optionally filter by expense category.
- CONFIRMED: Click a comment badge in table view to inspect read-only comments.

## Inputs And Outputs
- CONFIRMED: Inputs are period selection, display type, category filter, accounts, balance, budget, comments, and value conversion rates.
- CONFIRMED: Outputs are grouped table rows, Google TreeMap data, Chart.js stacked bar datasets, totals, budget progress bars, and comment badges.

## Data Files Read/Written
- CONFIRMED: Reads `accounts.json`, `balance_<year>.json`, `budget_<year>.json`, and `values_<year>.json`.
- CONFIRMED: Writes no files.

## Store / Helper / Component Files Involved
- CONFIRMED: `src/views/Expenses.vue`, `src/components/PeriodSelector.vue`, `src/components/CommentsDialog.vue`, `src/stores/accounts.ts`, `src/stores/storage.ts`, `src/stores/balance.ts`, `src/stores/budget.ts`, `src/stores/values.ts`, `src/helpers/options.ts`, `src/format.ts`.

## Error Handling
- CONFIRMED: Missing values generally collapse to empty arrays or zero totals through store/helper defaults.
- REQUIRED: When an expense or income summary cannot convert a child currency because an exchange rate is missing, the UI must display a partial total and a visible missing-rate indicator listing the affected currencies/accounts.
- IMPLEMENTED: Expense summaries preserve partial totals and display a missing-rate indicator when conversion rates are unavailable.

## Edge Cases
- CONFIRMED: Budget progress only renders when a budget value exists for the row/period.
- CONFIRMED: Category totals aggregate children and convert currencies into the global currency.
- CONFIRMED: Missing exchange rates must not be silently coerced to zero in UI summaries; unconverted child amounts are omitted from the displayed partial converted total and identified by the missing-rate indicator.

## Acceptance Criteria
- CONFIRMED: GIVEN the user opens `/expenses` without authentication, WHEN the route renders, THEN the router does not require authentication.
- CONFIRMED: GIVEN the user is unauthenticated, WHEN expenses render, THEN only expense groups are shown.
- CONFIRMED: GIVEN the user is authenticated, WHEN expenses render, THEN both income and expense groups are shown.
- CONFIRMED: GIVEN budget comments exist in months included by the selected grouped period, WHEN the table renders, THEN read-only comment badges expose the concatenated comments.
- CONFIRMED: GIVEN category children use different currencies, WHEN totals are rendered, THEN child values are converted into the global currency using available values rates.
- REQUIRED: GIVEN an expense or income child account uses a non-global currency and no exchange rate is available for the displayed period, WHEN the table, treemap, or bar summary renders, THEN the converted total is shown as a partial total and the UI displays a missing-rate indicator naming the affected currency and account.
- REQUIRED: GIVEN a conversion rate is explicitly stored as `0`, WHEN expense summaries are rendered, THEN the zero value is treated as present data and is not reported as missing.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/balance.spec.ts` covers grouped balance period logic.
- CONFIRMED: `src/stores/__tests__/budget.spec.ts` covers budget/comment grouping.
- CONFIRMED: `src/stores/__tests__/values.spec.ts` covers conversion lookup and joining values.
- CONFIRMED: `src/helpers/__tests__/groupData.spec.ts` covers period grouping.
- CONFIRMED: `src/views/__tests__/ExpensesMissingRates.spec.ts` covers partial totals with a visible missing-rate indicator for affected currencies/accounts.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered tests for table, treemap, or bar displays.
- CONFIRMED: No tests for unauthenticated vs authenticated expenses visibility.
- CONFIRMED: No tests for budget progress rendering or comment dialog behavior.
- CONFIRMED: Rendered expense summary coverage verifies missing conversion rates produce partial totals plus a visible missing-rate indicator with affected currencies/accounts.
- CONFIRMED: Rendered expense summary coverage verifies explicit zero rates/values are not flagged as missing.

## Product Questions
- UNCLEAR: Should income be hidden from unauthenticated users because it is sensitive, or because the current data-loading flow requires authentication?
