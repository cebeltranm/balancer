# Requirements Triage

This triage lists the product decisions opened after RT-043. Every earlier item (RT-001 to RT-043) is closed and recorded as `RESOLVED`, `REQUIRED`, or `IMPLEMENTED` in the feature, data-model, architecture, and validation specs. Their full triage text is in git history.

IDs continue from RT-044 so existing `RT-xxx` references in specs and tests stay unique. `specs/feature-template.md` also contains `UNCLEAR`, but only as marker instructions, so it is not listed.

When a decision is made, record it in the listed spec locations as `RESOLVED (RT-xxx)`, remove the `UNCLEAR` marker, and update the item's status here.

## Summary

| ID | Area | Spec locations | Question | Suggested solution | Status |
| --- | --- | --- | --- | --- | --- |
| RT-044 | Transaction dialog error logging | `features/transaction-dialogs.md` Error handling and Observability; `validation-and-errors.md` Logging and Code Alignment Follow-Ups | Must a failed local save in the transaction dialogs be logged with `console.error` as well as shown as a toast? | Yes. Apply the default RT-032 Logging rule with no override, and fix the code in the existing follow-up task. | Resolved |

## RT-044: Logging of failed local saves in the transaction dialogs

- **Status:** Resolved. The suggested solution was accepted (see Decision).
- **Unclear spec:**
  - `specs/features/transaction-dialogs.md` (Error handling) says "UNCLEAR: Logging the caught error with `console.error` is tracked as a code-alignment follow-up in `specs/validation-and-errors.md`, not here."
  - The same spec (Observability) says "The only observable output is the error toast on a failed local save. No other logs or telemetry are required."
  - `specs/validation-and-errors.md` (Logging, RT-032) requires that "Unexpected failures are logged with `console.error`" and that "Showing a toast does not replace logging of an unexpected failure." The feature spec does not name an override, so the default should apply. Its Observability line contradicts that.
- **Current behavior:** The `catch {}` blocks in `TransactionExpenseDialog.vue`, `TransactionTransferDialog.vue`, and `TransactionEditDialog.vue` show the "Transaction not saved" toast and do not log the error. `specs/validation-and-errors.md` lists this as "not satisfied" and as a Code Alignment Follow-Up (it also covers `Budget.vue`).
- **Question:** Is a failed local queue write in the transaction dialogs an unexpected failure that must also be logged with `console.error`? Or is the toast alone intended, which would need an explicit override?
- **Suggested solution:**
  - REQUIRED: Follow the default RT-032 Logging rule with no override. A failed local save shows the existing toast and logs the caught error with `console.error`, with context (for example, "transaction local save failed"). The log must not contain transaction values.
  - Replace the `UNCLEAR` line in `features/transaction-dialogs.md` with `RESOLVED (RT-044)`, and change its Observability line to say the error is also logged to the console.
  - Implement it as a fix in the existing follow-up task: add `console.error` to the three dialog `catch` blocks (and `Budget.vue`), assert the log in the component tests, and update the `validation-and-errors.md` contract status rows.
  - Alternative: keep the toast only and record "Overrides `validation-and-errors.md` Logging: toast only" in `features/transaction-dialogs.md` and in the override table of `validation-and-errors.md`. Not recommended, because the error object is then lost.
- **Effects if not resolved:**
  - The two specs contradict each other. A contributor can follow either one and still break the other, and reviewers cannot tell which one is the contract.
  - The Code Alignment Follow-Up for the transaction dialogs stays blocked, so the "Unexpected failure is both shown and logged" row in `validation-and-errors.md` stays "not satisfied".
  - When a local save fails (for example, IndexedDB quota or a private-browsing restriction), the user sees only a generic toast and nothing in the console records the cause. That makes the failure hard to diagnose or report.
  - Limited risk: no data is lost. The form stays open with the entered values and Save is available again (RT-009).
- **Decision:** RESOLVED (RT-044). Accepted as suggested: the default RT-032 Logging rule applies with no override. A failed local save in `TransactionEditDialog.vue`, `TransactionExpenseDialog.vue`, `TransactionTransferDialog.vue`, and `Budget.vue` now calls `console.error("Failed to save <transaction|budget> locally", error)` before showing the existing error message. `specs/features/transaction-dialogs.md`, `specs/features/transactions.md`, `specs/features/budget.md`, `specs/validation-and-errors.md`, and `specs/testing-strategy.md` carry `RESOLVED (RT-044)`; the matching Code Alignment Follow-Up is removed. Code status: satisfied. Tests: updated `TransactionEditDialog.spec.ts` and `Budget.spec.ts`; new `TransactionExpenseDialog.spec.ts` and `TransactionTransferDialog.spec.ts`.
