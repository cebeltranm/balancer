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
- UNCLEAR: There is no explicit user-facing error when chart data is incomplete or a conversion rate is missing.

## Edge Cases
- CONFIRMED: Budget progress only renders when a budget value exists for the row/period.
- CONFIRMED: Category totals aggregate children and convert currencies into the global currency.
- INFERRED: A missing exchange rate causes converted child amounts to contribute zero or be underrepresented depending on path.

## Acceptance Criteria
- CONFIRMED: GIVEN the user opens `/expenses` without authentication, WHEN the route renders, THEN the router does not require authentication.
- CONFIRMED: GIVEN the user is unauthenticated, WHEN expenses render, THEN only expense groups are shown.
- CONFIRMED: GIVEN the user is authenticated, WHEN expenses render, THEN both income and expense groups are shown.
- CONFIRMED: GIVEN budget comments exist in months included by the selected grouped period, WHEN the table renders, THEN read-only comment badges expose the concatenated comments.
- CONFIRMED: GIVEN category children use different currencies, WHEN totals are rendered, THEN child values are converted into the global currency using available values rates.
- UNCLEAR: The expected UI behavior for missing conversion rates or incomplete chart data is not specified.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/balance.spec.ts` covers grouped balance period logic.
- CONFIRMED: `src/stores/__tests__/budget.spec.ts` covers budget/comment grouping.
- CONFIRMED: `src/stores/__tests__/values.spec.ts` covers conversion lookup and joining values.
- CONFIRMED: `src/helpers/__tests__/groupData.spec.ts` covers period grouping.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered tests for table, treemap, or bar displays.
- CONFIRMED: No tests for unauthenticated vs authenticated expenses visibility.
- CONFIRMED: No tests for budget progress rendering or comment dialog behavior.

## Product Questions
- UNCLEAR: Should missing exchange rates display a warning, exclude the row, or display a partial total?
- UNCLEAR: Should income be hidden from unauthenticated users because it is sensitive, or because the current data-loading flow requires authentication?
