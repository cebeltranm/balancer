# Feature: Dashboard

## Goal
- CONFIRMED: Show a compact current-period finance summary on the home route.

## Observed Implementation
- CONFIRMED: `/` renders `src/views/HomeView.vue`.
- CONFIRMED: The dashboard reads the current period from `getCurrentPeriod()` and current-year balances from `useBalanceStore()`.
- CONFIRMED: It always summarizes Expenses and Credit Cards.
- CONFIRMED: When `storageStore.status.authenticated` is true, it also summarizes Cash, Bank Accounts, and Accounts Receivable.
- CONFIRMED: Totals are grouped by account type and currency and displayed with `AccountValueCard`.
- CONFIRMED: Current code satisfies the dashboard empty-state requirement; when no cards are available, `HomeView.vue` renders "No current balance data available".
- INFERRED: The dashboard depends on authentication startup loading current accounts and balances in `Auth.vue`.

## Product Contract
- REQUIRED: When no current balance cards are available, the dashboard must show the read-only empty state text: "No current balance data available".
- REQUIRED: Missing current balance data is not a dashboard error state. A failed-load error state is reserved for future error handling once load failures are explicitly represented.
- RESOLVED (RT-015): Dashboard cards must remain split by currency and must never be currency-converted. Each account group total is shown per currency, one card per (group, currency) pair. This is intended product behavior, not a gap. Converted totals are only used in reports that already depend on a global currency (e.g. Expenses, Balance, Budget, Assets, Transactions, portfolio views), not on the dashboard.

## User Flows
- CONFIRMED: User opens `/` and sees cards for available current-month balances.
- CONFIRMED: User authenticates, and the dashboard can reveal additional account groups.

## Inputs And Outputs
- CONFIRMED: Input is `balance_<currentYear>.json` and `accounts.json` loaded into stores.
- CONFIRMED: Output is read-only account group total cards by currency.

## Data Files Read/Written
- CONFIRMED: Reads `accounts.json` and `balance_<year>.json` indirectly through stores.
- CONFIRMED: Writes no files.

## Store / Helper / Component Files Involved
- CONFIRMED: `src/views/HomeView.vue`, `src/components/AccountValueCard.vue`, `src/stores/balance.ts`, `src/stores/accounts.ts`, `src/stores/storage.ts`, `src/helpers/options.ts`.

## Error Handling
- CONFIRMED: If no balance exists for the current year, the computed list returns an empty array.
- REQUIRED: If no current account or balance data is available for dashboard cards, show the read-only empty state: "No current balance data available".
- REQUIRED: Do not show a dashboard error state for missing current balance data until failed-load handling exists.

## Edge Cases
- CONFIRMED: Accounts with no current-month balance or zero/falsy value do not contribute a card.
- CONFIRMED: Values are not currency-converted on the dashboard; totals are separated by currency.
- CONFIRMED: `HomeView.vue` does not inject the global `CURRENCY` value and does not use `useValuesStore()`/conversion helpers, so a global currency selection has no effect on dashboard cards.

## Acceptance Criteria
- CONFIRMED: GIVEN the user opens `/` without authentication, WHEN the route renders, THEN no authentication dialog is required by the router guard for that route.
- CONFIRMED: GIVEN current-month expense or credit-card balance values exist, WHEN the dashboard renders, THEN corresponding summary cards are shown.
- CONFIRMED: GIVEN current-month cash, bank-account, or receivable values exist, WHEN the user is not locally authenticated, THEN those cards are hidden.
- CONFIRMED: GIVEN current-month cash, bank-account, or receivable values exist, WHEN the user is locally authenticated, THEN those cards are shown.
- CONFIRMED: GIVEN the dashboard renders, WHEN no user action is taken, THEN no finance JSON file is written.
- REQUIRED: GIVEN no current balance cards are available, WHEN the dashboard renders, THEN it shows the read-only text "No current balance data available".
- REQUIRED: GIVEN no current balance cards are available, WHEN the dashboard renders, THEN it does not show a failed-load error state.
- REQUIRED: GIVEN current balance cards are available, WHEN the dashboard renders, THEN it shows those cards and does not show the empty-state text.
- REQUIRED (RT-015): GIVEN current-month balances exist for the same account group in two different currencies, WHEN the dashboard renders, THEN it shows one separate card per currency for that group, and the amounts are not summed together or converted into a single currency.
- REQUIRED (RT-015): GIVEN a global currency (`CURRENCY`) is selected elsewhere in the app, WHEN the dashboard renders, THEN dashboard card amounts and currencies are unaffected by that selection.

## Existing Tests Related To This Feature
- CONFIRMED: `src/views/__tests__/HomeView.spec.ts` verifies the dashboard empty state and verifies that available cards hide the empty-state text.
- CONFIRMED: `src/stores/__tests__/balance.spec.ts` covers grouped balance behavior.
- CONFIRMED: `src/stores/__tests__/accounts.spec.ts` covers group-type helpers.
- CONFIRMED: `src/helpers/__tests__/options.spec.ts` covers current period helper behavior.

## Missing Tests / Coverage Gaps
- CONFIRMED: No test verifies authenticated vs unauthenticated dashboard group visibility.
- REQUIRED (RT-015): Add a test to `src/views/__tests__/HomeView.spec.ts` asserting that current-month balances for the same account group in two different currencies (e.g. `usd` and `cop`) render as two separate cards rather than one summed/converted total.
- REQUIRED (RT-015): Add a test to `src/views/__tests__/HomeView.spec.ts` asserting that two accounts in the same group and same currency are summed into a single card.
- RECOMMENDED (RT-015): Add a test that mounts `HomeView.vue` with a global `CURRENCY` value provided/injected and asserts dashboard card amounts and currencies are unchanged, guarding against future accidental conversion.

## Product Questions
- RESOLVED (RT-015): Dashboard totals must remain split by currency and must never be converted. Converted totals belong only in reports that already depend on a global currency. See Product Contract and Acceptance Criteria above.
- CONFIRMED: Current code (`src/views/HomeView.vue`, `src/components/AccountValueCard.vue`) already satisfies this requirement as written — no app code change is needed for RT-015. The gap is test coverage only (see Missing Tests above).
