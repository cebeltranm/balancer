# Feature: Accounts

## Goal
- CONFIRMED: Manage account definitions used by transactions, balances, budgets, values, and reports.

## Current Implemented Behavior
- CONFIRMED: `/settings/accounts` maps to `src/views/Accounts.vue` and requires authentication.
- CONFIRMED: The page filters accounts by account group and active/inactive visibility.
- CONFIRMED: Users can create, edit, hide, and unhide accounts.
- CONFIRMED: RT-003 is implemented: archive/hide is the normal path, and hard deletion is blocked in normal app code.
- CONFIRMED: Persisted accounts are saved to `accounts.json` keyed by account id, without an embedded `id`.
- CONFIRMED: Account grouping is defined by `ACCOUNT_GROUP_TYPES` in `src/stores/accounts.ts`.
- CONFIRMED: Expense accounts use category paths; non-expense accounts can use entity; investment accounts expose risk, symbol, logo, and class allocation.

## User Flows
- CONFIRMED: Filter list by group and visibility.
- CONFIRMED: Create a new account by selecting group/type/currency, entering id/name, dates, and type-specific metadata.
- CONFIRMED: Edit an existing account; id, group, type, and currency are disabled while editing.
- CONFIRMED: Hide active accounts by setting `hideSince`; unhide by clearing it.
- REQUIRED: Archive/hide is the normal account-removal path. Users must not be able to hard-delete accounts from normal app flows.

## Inputs And Outputs
- CONFIRMED: Inputs are account form fields, existing account ids, current date, and existing expense category paths.
- CONFIRMED: Outputs are updated `accounts.json`, filtered account rows, and account category/group helper structures.

## Data Files Read/Written
- CONFIRMED: Reads and writes `accounts.json`.
- REQUIRED: Hiding an account keeps its `accounts.json` key in place and persists `hideSince`; transactions, budgets, values, and balances can continue to resolve historical account ids.
- CONFIRMED: Hard deletion does not remove account keys from `accounts.json`.

## Store / Helper / Component Files Involved
- CONFIRMED: `src/views/Accounts.vue`, `src/stores/accounts.ts`, `src/types.ts`, PrimeVue form/table components.

## Error Handling
- CONFIRMED: Validation errors are shown inline and disable save.
- CONFIRMED: Failed save sets `saveError` for dialog display.
- REQUIRED: Hard delete actions must be unavailable or blocked before persistence. The app should guide users to hide/archive instead.

## Edge Cases
- CONFIRMED: Account active status is month-granular for visibility.
- CONFIRMED: `activeAccounts()` includes accounts whose `activeFrom` month is <= target month and whose `hideSince` month is > target month.
- CONFIRMED: Empty category and class fields are omitted on save.
- INFERRED: Legacy account types not in `AccountType` may load but not group correctly.

## Acceptance Criteria
- CONFIRMED: GIVEN a new account form with a missing, duplicate, or non-`/^[a-z0-9_]+$/i` id, WHEN the user attempts to save, THEN save is blocked and an inline validation error is shown.
- CONFIRMED: GIVEN an expense account without at least one category segment, WHEN the user attempts to save, THEN save is blocked.
- CONFIRMED: GIVEN an investment account without entity, risk outside 1-5, or class allocation total different from 100%, WHEN the user attempts to save, THEN save is blocked.
- CONFIRMED: GIVEN a valid account save, WHEN `accounts.json` is written, THEN persisted date fields are `YYYY-MM-DD` strings and the saved account payload does not include an embedded `id`.
- CONFIRMED: GIVEN an existing account, WHEN the edit dialog is opened, THEN id, group, type, and currency controls are disabled.
- REQUIRED: GIVEN an existing active account, WHEN the user wants to remove it from normal use, THEN the app hides/archives the account by setting `hideSince` and keeps the account id in `accounts.json`.
- REQUIRED: GIVEN an existing hidden account, WHEN historical transactions, budgets, values, or balances reference that account id, THEN the account definition remains available for lookup and reporting.
- REQUIRED: GIVEN any existing account, WHEN normal app code attempts hard deletion, THEN the account is not removed from `accounts.json`.
- REQUIRED: GIVEN the account management UI is rendered, WHEN an existing account is edited, THEN no hard-delete action is available from the normal flow.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/accounts.spec.ts` covers load/parse, group helpers, active filtering, save serialization, hide/archive, unhide, and blocked hard deletion.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered `Accounts.vue` tests for validation, filters, dialogs, or blocked delete affordances.
- CONFIRMED: No test verifies investment allocation validation in the UI.
- CONFIRMED: No migration test for legacy `public/accounts.json` account types.
- CONFIRMED: Store tests assert that account hide/archive persists `hideSince` while preserving the account key.
- CONFIRMED: Store tests assert that hard deletion is blocked and does not write an `accounts.json` payload with the account key removed.
- CONFIRMED: The edit dialog no longer exposes a hard-delete action; rendered account-management coverage is still missing for this UI assertion.

## Product Questions
- UNCLEAR: Should legacy account type strings be migrated, tolerated, or rejected during load?
