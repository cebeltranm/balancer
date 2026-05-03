# Feature: Dashboard

## Goal
- CONFIRMED: Show a compact current-period finance summary on the home route.

## Current Implemented Behavior
- CONFIRMED: `/` renders `src/views/HomeView.vue`.
- CONFIRMED: The dashboard reads the current period from `getCurrentPeriod()` and current-year balances from `useBalanceStore()`.
- CONFIRMED: It always summarizes Expenses and Credit Cards.
- CONFIRMED: When `storageStore.status.authenticated` is true, it also summarizes Cash, Bank Accounts, and Accounts Receivable.
- CONFIRMED: Totals are grouped by account type and currency and displayed with `AccountValueCard`.
- INFERRED: The dashboard depends on authentication startup loading current accounts and balances in `Auth.vue`.

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
- UNCLEAR: No explicit UI error state is shown for missing or failed balance/account loads.

## Edge Cases
- CONFIRMED: Accounts with no current-month balance or zero/falsy value do not contribute a card.
- CONFIRMED: Values are not currency-converted on the dashboard; totals are separated by currency.

## Acceptance Criteria
- CONFIRMED: GIVEN the user opens `/` without authentication, WHEN the route renders, THEN no authentication dialog is required by the router guard for that route.
- CONFIRMED: GIVEN current-month expense or credit-card balance values exist, WHEN the dashboard renders, THEN corresponding summary cards are shown.
- CONFIRMED: GIVEN current-month cash, bank-account, or receivable values exist, WHEN the user is not locally authenticated, THEN those cards are hidden.
- CONFIRMED: GIVEN current-month cash, bank-account, or receivable values exist, WHEN the user is locally authenticated, THEN those cards are shown.
- CONFIRMED: GIVEN the dashboard renders, WHEN no user action is taken, THEN no finance JSON file is written.
- UNCLEAR: The intended empty/error state for missing account or balance data is not specified.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/balance.spec.ts` covers grouped balance behavior.
- CONFIRMED: `src/stores/__tests__/accounts.spec.ts` covers group-type helpers.
- CONFIRMED: `src/helpers/__tests__/options.spec.ts` covers current period helper behavior.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered `HomeView.vue` component test.
- CONFIRMED: No test verifies authenticated vs unauthenticated dashboard group visibility.
- CONFIRMED: No test verifies cards are grouped by currency.

## Product Questions
- UNCLEAR: Should the dashboard show an empty state, skeleton, or error if current balances are unavailable?
- UNCLEAR: Should dashboard totals ever convert currencies, or must they remain split by currency?
