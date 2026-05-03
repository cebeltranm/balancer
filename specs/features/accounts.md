# Feature: Accounts

## Goal
- CONFIRMED: Manage account definitions used by transactions, balances, budgets, values, and reports.

## Current Implemented Behavior
- CONFIRMED: `/settings/accounts` maps to `src/views/Accounts.vue` and requires authentication.
- CONFIRMED: The page filters accounts by account group and active/inactive visibility.
- CONFIRMED: Users can create, edit, hide, unhide, and delete accounts.
- CONFIRMED: Persisted accounts are saved to `accounts.json` keyed by account id, without an embedded `id`.
- CONFIRMED: Account grouping is defined by `ACCOUNT_GROUP_TYPES` in `src/stores/accounts.ts`.
- CONFIRMED: Expense accounts use category paths; non-expense accounts can use entity; investment accounts expose risk, symbol, logo, and class allocation.

## User Flows
- CONFIRMED: Filter list by group and visibility.
- CONFIRMED: Create a new account by selecting group/type/currency, entering id/name, dates, and type-specific metadata.
- CONFIRMED: Edit an existing account; id, group, type, and currency are disabled while editing.
- CONFIRMED: Hide active accounts by setting `hideSince`; unhide by clearing it.
- CONFIRMED: Delete an account after a confirmation warning.

## Inputs And Outputs
- CONFIRMED: Inputs are account form fields, existing account ids, current date, and existing expense category paths.
- CONFIRMED: Outputs are updated `accounts.json`, filtered account rows, and account category/group helper structures.

## Data Files Read/Written
- CONFIRMED: Reads and writes `accounts.json`.
- INFERRED: Other files may contain stale references after account deletion; no automatic cleanup is performed.

## Store / Helper / Component Files Involved
- CONFIRMED: `src/views/Accounts.vue`, `src/stores/accounts.ts`, `src/types.ts`, PrimeVue form/table components.

## Error Handling
- CONFIRMED: Validation errors are shown inline and disable save.
- CONFIRMED: Failed save/delete sets `saveError` for dialog display.
- CONFIRMED: Delete warns about references from transactions, balances, budgets, and other saved data.

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
- UNCLEAR: The required behavior for existing references after account deletion is not specified beyond the current warning.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/accounts.spec.ts` covers load/parse, group helpers, active filtering, save serialization, unhide, and delete.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered `Accounts.vue` tests for validation, filters, dialogs, or delete warnings.
- CONFIRMED: No test verifies investment allocation validation in the UI.
- CONFIRMED: No migration test for legacy `public/accounts.json` account types.

## Product Questions
- UNCLEAR: Should account deletion be blocked when transactions, budgets, values, or balances reference the account?
- UNCLEAR: Should legacy account type strings be migrated, tolerated, or rejected during load?
