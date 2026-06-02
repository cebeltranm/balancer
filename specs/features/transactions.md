# Feature: Transactions

## Goal
- CONFIRMED: Let users view, create, edit, delete, tag, and locally queue monthly transactions.

## Current Implemented Behavior
- CONFIRMED: `/Transactions` maps to `src/views/Transactions.vue`; the menu links to `/transactions`, relying on path matching behavior outside this spec.
- CONFIRMED: Transactions are stored by month in `transactions_<year>_<month>.json`.
- CONFIRMED: The transaction list filters transaction value rows by selected accounts and shows date, account, description, tags, value, edit/delete actions, selected total, and optional account balances.
- CONFIRMED: Pending rows with `to_sync` are styled via `rowClass`.
- CONFIRMED: `TransactionEditDialog.vue` creates or edits transactions and validates with Zod.
- CONFIRMED: Editing an existing transaction first queues deletion of the original transaction, then saves a new transaction with a fresh `Date.now()` id.
- CONFIRMED: The product decision for transaction edit identity is to continue using delete-plus-new-id. Code currently satisfies this requirement.
- CONFIRMED: Deleting a transaction queues it in IndexedDB with `deleted: true`.
- CONFIRMED: The store merges pending IndexedDB transactions over the remote monthly file on load.

## User Flows
- CONFIRMED: Select accounts and period, then view matching transaction value rows.
- CONFIRMED: Click edit to open the transaction dialog with existing values.
- CONFIRMED: Enter a new transaction with date, description, tags, accounts, values, cross-currency account values, and unit counts where required.
- CONFIRMED: Confirm delete to hide a transaction locally and queue deletion for sync.
- CONFIRMED: Account selection is reflected in the route query.

## Inputs And Outputs
- CONFIRMED: Inputs are selected period, selected account ids, transaction form fields, account metadata, and values exchange rates.
- CONFIRMED: Outputs are visible transaction rows, selected totals converted through `valuesStore.joinValues()`, and queued IndexedDB transaction records.

## Data Files Read/Written
- CONFIRMED: Reads `transactions_<year>_<month>.json`, `accounts.json`, `values_<year>.json`, and `balance_<year>.json`.
- CONFIRMED: Writes pending transaction records to IndexedDB; sync later stages `transactions_<year>_<month>.json` and recalculates `balance_<year>.json`.

## Store / Helper / Component Files Involved
- CONFIRMED: `src/views/Transactions.vue`, `src/components/TransactionEditDialog.vue`, `src/components/AccountsSelector.vue`, `src/components/PeriodSelector.vue`, `src/stores/transactions.ts`, `src/stores/accounts.ts`, `src/stores/balance.ts`, `src/stores/values.ts`, `src/helpers/transactionForms.ts`, `src/helpers/sync.ts`, `src/helpers/date.ts`.

## Error Handling
- CONFIRMED: Form errors are stored in `formErrors` and displayed next to fields.
- CONFIRMED: Delete requires PrimeVue confirmation.
- CONFIRMED: Future dates, short descriptions, invalid expense sign, missing units, and non-zero transaction sums are rejected.
- UNCLEAR: Failed IndexedDB saves are not surfaced in the UI.

## Edge Cases
- CONFIRMED: Cross-currency transaction values store both `value` and `accountValue`.
- CONFIRMED: Unit-based accounts are ETF, Stock, and Crypto.
- CONFIRMED: Recent transaction suggestions search up to 6 months and 5 results.
- CONFIRMED: `getLastTags()` scans up to the last 3 loaded months.
- INFERRED: If transaction ids collide, merge-by-id can replace unintended rows.
- CONFIRMED: Transaction ids are not stable audit identities across edits; an edit is represented as a deleted original transaction plus a newly-created replacement transaction.

## Acceptance Criteria
- CONFIRMED: GIVEN a remote monthly file and pending IndexedDB transactions for the same month, WHEN the month is loaded, THEN visible rows include non-deleted pending rows and remote rows not replaced by the same pending ids.
- CONFIRMED: GIVEN a pending transaction with `deleted: true`, WHEN the month is loaded, THEN that transaction is excluded from the visible list.
- CONFIRMED: GIVEN a valid transaction form, WHEN the user saves, THEN the queued IndexedDB record does not persist a local `to_sync` property on the transaction payload.
- CONFIRMED: GIVEN transaction values whose sum is not approximately zero, WHEN the user attempts to save, THEN the form rejects the save and displays a validation error.
- CONFIRMED: GIVEN an existing transaction is edited, WHEN save succeeds, THEN the original id is queued as deleted and the edited transaction is queued with a new id.
- REQUIRED: GIVEN an existing transaction with id `oldId`, WHEN the user saves edits, THEN `deleteTransaction()` is called for the original transaction before the edited replacement is queued.
- REQUIRED: GIVEN an existing transaction with id `oldId`, WHEN the edited replacement is queued, THEN the replacement id is a fresh `Date.now()` id and is not required to equal `oldId`.
- REQUIRED: GIVEN an edited transaction has both original deletion and replacement records pending, WHEN transactions sync, THEN the durable monthly file omits the deleted original id and includes the replacement transaction unless another queued row with the replacement id supersedes it.
- UNCLEAR: The product response for an IndexedDB write failure is not specified beyond the current lack of visible UI feedback.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/transactions.spec.ts` covers monthly load/merge, save queueing, and delete queueing.
- CONFIRMED: `src/helpers/__tests__/sync.spec.ts` covers monthly merge and queue cleanup.
- CONFIRMED: `src/helpers/__tests__/groupData.spec.ts` and `options.spec.ts` cover period mechanics used by related reporting.
- REQUIRED: Transaction dialog tests should cover edit submit as delete-plus-new-id by asserting the original id is queued deleted and the replacement save uses a fresh id.
- REQUIRED: Sync tests should continue to assert that deleted queued transaction ids are omitted from staged monthly files and non-deleted queued replacement transactions are appended.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered tests for `Transactions.vue` or `TransactionEditDialog.vue`.
- CONFIRMED: No direct tests for Zod validation rules in the transaction dialog.
- CONFIRMED: No integration test covers edit-as-delete-plus-new-save and subsequent balance recalculation.

## Product Questions
- RESOLVED: Editing continues to use delete-plus-new-id; preserving original transaction ids for audit/history is out of scope for the current product model.
- UNCLEAR: What user-visible message or retry option should appear when local queue writes fail?
