# Feature: Transaction Dialogs

## Goal
- CONFIRMED: Let users add a transaction from the top bar through a type picker and two quick-add forms (Expense and Transfer), or through the general transaction form, with the same save rules as the Transactions screen.

## Scope
In scope:
- CONFIRMED: The top-bar "add transaction" entry point and the type picker with Expenses, Transfer, and General options.
- CONFIRMED: The Expense quick-add form (one expense account, one payment account, one amount) and the Transfer quick-add form (source account, destination account, amount, and a target amount when currencies differ).
- CONFIRMED: Their validation, the transaction they queue locally, and local save failure handling.

Out of scope:
- CONFIRMED: The general transaction form (create and edit), which is specified in `specs/features/transactions.md`. This spec only defines how the picker opens it.
- CONFIRMED: Editing an existing transaction from the quick-add forms. They only create.
- CONFIRMED: Tags and unit counts in the quick-add forms (RT-043).
- CONFIRMED: Sync and balance recalculation after the transaction is queued (see `specs/features/storage-sync.md` and `specs/features/balance.md`).

## Product Contract
Intended behavior that must survive refactors. Anything not listed here is not a product requirement, even if the code currently does it.
- RESOLVED (RT-038): The top-bar Expense and Transfer quick-add forms are a supported flow. Choosing "add transaction" in the top bar opens a picker with three options: Expenses, Transfer, and General. Choosing one closes the picker and opens that form: the Expense form, the Transfer form, or the general transaction form.
- RESOLVED (RT-038): The quick-add forms follow the same rules as the general transaction form:
  - The date cannot be in the future.
  - Amounts must be positive.
  - The two entries of the saved transaction sum to zero.
  - The saved transaction gets a fresh `Date.now()` id.
  - A cross-currency transaction needs an available exchange rate.
  - A failed local queue write is blocking (RT-009): show an error, keep the form open with the entered values, and do not close or reset it.
  - RESOLVED (RT-044): A failed local queue write is also logged with `console.error`, with the caught error and a short context message, following the default Logging rule in `specs/validation-and-errors.md` (no override). The log contains no transaction values.
- RESOLVED (RT-038): The quick-add forms only create transactions. They never delete or replace an existing one, so the delete-plus-new-id rule (RT-008) does not apply to them.
- RESOLVED (RT-042): A transaction description must be non-empty (at least 1 character) in both the Expense form and the general transaction form. This replaces the earlier 5-character minimum of the general form. The Transfer form has no description input; it generates one that names the source and destination accounts.
- RESOLVED (RT-043): The quick-add forms intentionally do not offer tags or unit counts, and only list payment-type accounts (cash, bank, credit card, receivable, payable) for the payment, source, and destination accounts. Users who need tags, unit-based accounts (ETF, Stock, Crypto), or more than two entries use the General option.
- REQUIRED: An Expense form entry is a debit of the expense account and an equal credit of the payment account. A Transfer form entry is a credit of the source account and a debit of the destination account.

## User Flows
- CONFIRMED: Open the top-bar add action, choose Expenses, fill date, description, expense account, payment account, and value, then save. The form closes and the transaction is queued locally.
- CONFIRMED: In the Expense form, choosing a suggestion from the description autocomplete (recent simple expense transactions) fills description, accounts, and value.
- CONFIRMED: Choose Transfer, fill date, source account, destination account, and value (plus the destination currency value when the two currencies differ), then save.
- CONFIRMED: Choose General to open the general transaction form (`specs/features/transactions.md`).
- CONFIRMED: Cancel closes the form without saving.

## Observed Implementation
Current code traceability only. Nothing here is a requirement; if it conflicts with the Product Contract, the code is a bug or a pending product decision.
- CONFIRMED: `src/layout/AppTopbar.vue` renders `TransactionTypeDialog`. Its add action calls `show()` on it.
- CONFIRMED: `src/components/TransactionTypeDialog.vue` shows the three buttons. Each one closes the picker and calls `show()` on `TransactionExpenseDialog`, `TransactionTransferDialog`, or `TransactionEditDialog`.
- CONFIRMED: `src/components/TransactionExpenseDialog.vue` validates with Zod: date not in the future, `description` at least 1 character, expense and payment accounts required and different, `value > 0`, and (cross-currency only) a chosen value currency and an exchange rate above 0. When the two accounts have different currencies the user can enter the value in either currency; the other side is derived from `valuesStore.getValue()`.
- CONFIRMED: The Expense form builds a transaction with `id: Date.now()`, the expense entry (`value` and `accountValue` equal to the expense-currency amount) and the payment entry (`value` equal to the negative of that amount, `accountValue` equal to the negative payment-currency amount). It does not set `tags` or `units`.
- CONFIRMED: The Expense form loads balance and budget data for the selected year and shows a remaining-budget summary under the expense account.
- CONFIRMED: `src/components/TransactionTransferDialog.vue` validates date not in the future, source and destination required and different, `value > 0`, and (cross-currency only) a positive target value and an exchange rate above 0. The target value is pre-filled from the exchange rate until the user edits it.
- CONFIRMED: The Transfer form builds a transaction with `id: Date.now()`, the description `Transfer <source name> -> <destination name>`, a source entry of `-value` and a destination entry of `+value` whose `accountValue` is the target value.
- CONFIRMED: Account options come from `buildAccountOptions()` with `PAYMENT_ACCOUNT_TYPES` in `src/helpers/transactionForms.ts`.
- CONFIRMED: Both forms save through `transactionsStore.saveTransaction()`. On success they call `close()` then `resetState()`. On failure, the `catch` logs `console.error("Failed to save transaction locally", error)`, emits an `error` message "Transaction not saved", and leaves the form open with its values.
- CONFIRMED: Both forms show the Save button only while not saving, and re-validate on every change once an error has been shown.
- CONFIRMED: `TransactionEditDialog.vue` currently validates the description with `z.string().min(5)`.
- CONFIRMED: Contract status:
  - Supported flow and picker routing (RT-038): satisfied; no test covers the picker or the forms (`src/layout/__tests__/AppTopbar.spec.ts` stubs the picker).
  - Shared rules (date, positive amounts, balanced entries, fresh id, cross-currency rate) for the quick-add forms (RT-038): satisfied; no test.
  - Blocking local save failure for the quick-add forms (RT-009 via RT-038): satisfied; covered by `TransactionExpenseDialog.spec.ts` and `TransactionTransferDialog.spec.ts`.
  - Failed local save is logged with `console.error` (RT-044): satisfied in both quick-add forms and the general form; covered by `TransactionExpenseDialog.spec.ts`, `TransactionTransferDialog.spec.ts`, and `TransactionEditDialog.spec.ts`.
  - Non-empty description (RT-042): Expense form satisfied; general form **not satisfied** (still requires 5 characters; `TransactionEditDialog.spec.ts` asserts the 5-character rule); Transfer form not applicable.
  - Tags, units, and account types omitted from quick-add (RT-043): satisfied; no test.

## API / CLI / UI contract
- CONFIRMED: Picker header "New transaction", buttons "Expenses", "Transfer", "General".
- CONFIRMED: Expense form header "New expense"; fields Date, Description, Expense, Payment account, Value (with a currency selector when the two accounts' currencies differ); buttons Save and Cancel.
- CONFIRMED: Transfer form header "New transfer"; fields Date, From, To, Value, and a "<CURRENCY> value" field when currencies differ; buttons Save and Cancel.
- CONFIRMED: Each form exposes `show()` and `close()`.

## Data model changes
- CONFIRMED: None. Both forms write the existing `Transaction` shape queued for `transactions_<year>_<month>.json` (see `specs/data-model.md`), using only `id`, `date`, `description`, and `values` (`accountId`, `value`, `accountValue`).
- CONFIRMED: Relaxing the general form's description minimum from 5 to 1 (RT-042) is backward compatible: stored transactions are not revalidated and the persisted shape is unchanged.

## Validation rules
- CONFIRMED: Defaults come from `specs/validation-and-errors.md`; this feature overrides none of them.
- CONFIRMED: Date in the future: "Can not add future transaction" next to the date field; no save.
- CONFIRMED: Empty description (Expense form, and the general form after RT-042): "Description is required"; no save.
- CONFIRMED: Same expense and payment account (Expense) or same source and destination (Transfer): inline error on the second account; no save.
- CONFIRMED: Missing account: inline "required" error on that field; no save.
- CONFIRMED: Value missing, zero, or negative: "Value should be positive"; no save.
- CONFIRMED: Different currencies and no exchange rate for the date: "No exchange rate available for these accounts"; no save.
- CONFIRMED: Transfer between different currencies and no positive target value: "Second currency value is required"; no save.

## Error handling
- REQUIRED: Follow the defaults in `specs/validation-and-errors.md`. This feature does not override any of them.
- CONFIRMED: A failed local queue write (RT-009) shows the error message "Transaction not saved / The transaction could not be saved locally. Please try again.", keeps the form open with the entered values, and re-enables Save.
- RESOLVED (RT-044): The caught error is also logged with `console.error` (default Logging rule in `specs/validation-and-errors.md`; no override).

## Security / permissions
- CONFIRMED: No route gate. The forms write only to the local queue; nothing is sent to a provider until sync.

## Observability
- RESOLVED (RT-044): A failed local save shows the error toast and logs the caught error with `console.error` in the browser console. No remote telemetry is required.

## Acceptance criteria
- [ ] REQUIRED (RT-038): GIVEN the top-bar add action is used, WHEN the user picks Expenses, Transfer, or General, THEN the picker closes and the matching form opens.
- [ ] REQUIRED (RT-038): GIVEN a valid Expense form, WHEN the user saves, THEN one transaction is queued with a fresh `Date.now()` id and two entries that sum to zero, and the form closes and resets.
- [ ] REQUIRED (RT-038): GIVEN a valid Transfer form, WHEN the user saves, THEN one transaction is queued with a fresh `Date.now()` id, a description naming the source and destination accounts, and two entries that sum to zero, and the form closes and resets.
- [ ] REQUIRED (RT-038): GIVEN a future date, WHEN the user saves either form, THEN the save is blocked with a visible error and nothing is queued.
- [ ] REQUIRED (RT-038): GIVEN a zero or negative value, WHEN the user saves either form, THEN the save is blocked with a visible error and nothing is queued.
- [ ] REQUIRED (RT-038): GIVEN the same account is chosen on both sides, WHEN the user saves either form, THEN the save is blocked with a visible error.
- [ ] REQUIRED (RT-038): GIVEN accounts in different currencies and no exchange rate for the date, WHEN the user saves either form, THEN the save is blocked with a visible error.
- [ ] REQUIRED (RT-009): GIVEN the local queue write fails, WHEN the user saves either form, THEN an error message is shown, the form stays open with the entered values, and Save is available again.
- [ ] RESOLVED (RT-044): GIVEN the local queue write fails, WHEN the user saves either quick-add form or the general form, THEN the caught error is logged with `console.error` in addition to the error message.
- [ ] REQUIRED (RT-042): GIVEN an empty description, WHEN the user saves the Expense form or the general form, THEN the save is blocked with "Description is required".
- [ ] REQUIRED (RT-042): GIVEN a description of 1 to 4 characters, WHEN the user saves the Expense form or the general form with otherwise valid data, THEN the transaction is queued.
- [ ] REQUIRED (RT-043): GIVEN either quick-add form is open, THEN it offers no tags or unit fields and lists only payment-type accounts for the payment, source, and destination accounts.

## Test plan
Required coverage levels and conventions are defined in `specs/testing-strategy.md`; the matrix row for this feature is there.

- Unit: none required beyond the existing `src/helpers/transactionForms.ts` helpers.
- Component (REQUIRED): `TransactionExpenseDialog.spec.ts`, `TransactionTransferDialog.spec.ts`, and `TransactionTypeDialog.spec.ts` following the RT-031 pattern; plus an update to `TransactionEditDialog.spec.ts` for the RT-042 description rule.
- Integration: none required.
- Manual: date picker, account select filters, and the description autocomplete in a real browser.

## Missing Tests / Coverage Gaps
- CONFIRMED: `TransactionExpenseDialog.spec.ts` and `TransactionTransferDialog.spec.ts` cover only the failed local save (RT-009, RT-044). Validation, the queued transaction shape, and RT-043 are not tested. No test renders `TransactionTypeDialog`.
- CONFIRMED: `AppTopbar.spec.ts` stubs the picker, so the top-bar add action opening it is not tested.
- CONFIRMED: `TransactionEditDialog.spec.ts` asserts the old 5-character rule and must change with RT-042.

## Product questions
- RESOLVED (RT-038): The quick-add dialogs are supported and follow the general transaction form's rules.
- RESOLVED (RT-042): The description minimum is 1 character in the Expense and general forms.
- RESOLVED (RT-043): Tags and units are intentionally absent from the quick-add forms.
- RESOLVED (RT-044): A failed local save is logged with `console.error` as well as shown; no logging override.
