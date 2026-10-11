# Feature: Budget

## Goal
- CONFIRMED: Maintain yearly monthly expense budgets and comments.

## Observed Implementation
- CONFIRMED: `/settings/budget` maps to `src/views/Budget.vue`.
- CONFIRMED: The view displays expense accounts grouped under category rows, with 12 editable monthly columns.
- CONFIRMED: Users can edit monthly budget cells, apply a month value to subsequent months, remove a month value, and add comments.
- CONFIRMED: Edited rows are marked pending and the router pending-change flag is emitted.
- CONFIRMED: Saving writes `{ values, comments }` to `budget_<year>.json` in IndexedDB cache with `to_sync: true`.
- CONFIRMED: Budget totals convert currencies through `valuesStore.joinValues()`.
- CONFIRMED: `src/components/CommentsDialog.vue` creates each comment as `{ m: <text>, d: Date.now() }` (`addComment`), edits only `m` (`updateComment`), and uses `d` as the list key and as the id for edit and delete (`deleteComment` removes every comment whose `d` matches). `src/views/Budget.vue` (`addComments`) stores the emitted array unchanged, so saved files already contain `{ m, d }` objects. No author is stored.
- CONFIRMED: `src/stores/budget.ts` types comments as `string[]` (`YearlyCommentsData`, `GroupedCommentsData`) and `loadBudgetForYear()` assigns `data.comments` without normalization. A plain-string comment therefore reaches `CommentsDialog` unchanged, where `comment.m` and `comment.d` are `undefined`: the row renders blank and cannot be edited, and several such rows share the same `undefined` key.
- CONFIRMED: Contract status: satisfied for RT-009 (see Existing Tests). RT-033: partially satisfied. The UI already creates and edits comments in the `{ m, d }` shape without an author; legacy plain-string normalization on load, the store types, single-comment edit/delete when `d` values repeat, and the RT-033 tests are not implemented.

## Product Contract
- REQUIRED (RT-009): A failed local queue write is blocking: show an error, keep budget edits pending, and do not mark the edit as saved.
- RESOLVED (RT-033): A budget comment is `{ m: string, d: number }`. `m` is the comment text. `d` is the creation time in epoch milliseconds, set when the comment is added and never changed by editing.
- RESOLVED (RT-033): Comments have no author field. An author may be added later as an optional field without changing the shape.
- RESOLVED (RT-033): A legacy plain-string comment is accepted on load and read as `{ m: <string>, d: 0 }`. `d: 0` means "creation time unknown". The year is written back in the object shape the next time that year's budget is saved; loading alone does not rewrite the file.
- RESOLVED (RT-033): A comment that already has the object shape keeps its `m` and `d` unchanged on load; normalization never replaces or drops a stored creation time.
- REQUIRED (RT-033): `d` is not guaranteed to be unique within a month cell (several legacy comments all have `d: 0`). Editing or deleting a comment changes only that one comment.

## User Flows
- CONFIRMED: Select budget year.
- CONFIRMED: Edit one or more month cells.
- CONFIRMED: Right-click an expense row/month for apply-next, remove, or add-comment actions.
- CONFIRMED: Save when pending changes exist.

## Inputs And Outputs
- CONFIRMED: Inputs are selected year, expense accounts, current yearly budget values, comments, and currency rates.
- CONFIRMED: Outputs are updated budget/comment objects and rendered totals by row/month/year.

## Data Files Read/Written
- CONFIRMED: Reads `budget_<year>.json`, `accounts.json`, and `values_<year>.json`.
- CONFIRMED: Writes `budget_<year>.json`.

## Store / Helper / Component Files Involved
- CONFIRMED: `src/views/Budget.vue`, `src/components/PeriodSelector.vue`, `src/components/CommentsDialog.vue`, `src/stores/budget.ts`, `src/stores/accounts.ts`, `src/stores/values.ts`, `src/helpers/options.ts`, `src/helpers/events.ts`.

## Error Handling
- CONFIRMED: Inline budget edits are accepted only when new values are non-negative and changed.
- CONFIRMED: Empty comments remove the month comment entry.
- RESOLVED (RT-033): A legacy plain-string comment is not an invalid file; it loads as `{ m: <string>, d: 0 }`.
- CONFIRMED: Local IndexedDB queue write failures are blocking save failures: the budget view shows an error toast message, keeps pending edits pending, keeps the pending-change navigation guard active, and does not update budget store state as if the save succeeded.

## Edge Cases
- CONFIRMED: Category rows are not directly editable.
- CONFIRMED: Missing budget months are treated as `null`/zero in display and grouping.
- CONFIRMED: `FORM_WITH_PENDING_EVENTS` blocks navigation while unsaved budget edits are pending.
- INFERRED: Save does not clear the pending form event directly; store watcher recalculation resets it after store update.
- CONFIRMED: Any inline edit coerces the row's empty (`null`) months to `0` (`Number(null)`), so editing one cell of a partially filled row marks the row pending and saves `0` for its empty months, even when the edited value itself is rejected as negative.

## Acceptance Criteria
- CONFIRMED: GIVEN a yearly budget file is loaded, WHEN `values` or `comments` are missing, THEN the store treats the missing section as an empty object.
- CONFIRMED: GIVEN monthly values exist for a quarter or year, WHEN grouped budget data is requested, THEN the grouped value equals the sum of included months.
- CONFIRMED: GIVEN comments exist across months in a grouped period, WHEN grouped comments are requested, THEN the result concatenates the included month comment arrays.
- CONFIRMED: GIVEN pending budget edits exist, WHEN the user saves, THEN `budget_<year>.json` is staged in IndexedDB with `to_sync: true` and pending sync counters are updated.
- CONFIRMED: GIVEN unsaved budget edits exist, WHEN the user navigates away, THEN the pending-form route guard blocks navigation.
- CONFIRMED: GIVEN pending budget edits exist, WHEN the local IndexedDB queue write fails, THEN the app shows a local save failure error and keeps the edits pending.
- CONFIRMED: GIVEN the local budget queue write fails, WHEN failure handling completes, THEN `budgetStore.budget[year]` and `budgetStore.comments[year]` are not replaced with the failed values.
- CONFIRMED: GIVEN the local budget queue write fails, WHEN failure handling completes, THEN `FORM_WITH_PENDING_EVENTS` remains true and the Save action remains available.
- CONFIRMED: GIVEN the local budget queue write fails, WHEN failure handling completes, THEN pending sync counters are not updated for that failed write.
- RESOLVED (RT-033): GIVEN the user adds a comment to a month cell, WHEN the comments are saved, THEN the stored comment is `{ m: <text>, d: <creation epoch ms> }` with no author field. Code status: SATISFIED (`CommentsDialog.vue` `addComment`); no test.
- RESOLVED (RT-033): GIVEN an existing comment, WHEN the user edits its text, THEN `m` changes and `d` keeps its original value. Code status: SATISFIED (`updateComment`); no test.
- RESOLVED (RT-033): GIVEN `budget_<year>.json` stores a month's comments as plain strings, WHEN the year is loaded, THEN each string is read as `{ m: <string>, d: 0 }` and the comment text is shown in the budget comments dialog and the read-only expenses popover. Code status: NOT SATISFIED (no normalization in `loadBudgetForYear()`; the rows render blank).
- RESOLVED (RT-033): GIVEN a month's comments mix plain strings and `{ m, d }` objects, WHEN the year is loaded, THEN strings become `{ m, d: 0 }`, objects keep their `m` and `d`, and the original order is preserved. Code status: NOT SATISFIED.
- RESOLVED (RT-033): GIVEN a year was loaded with legacy plain-string comments, WHEN that year's budget is saved, THEN `budget_<year>.json` is written with every comment in the `{ m, d }` shape. Code status: NOT SATISFIED (depends on load normalization).
- RESOLVED (RT-033): GIVEN a year with legacy plain-string comments, WHEN it is loaded and not saved, THEN the file is not rewritten and no sync is queued. Code status: SATISFIED (load does not write).
- REQUIRED (RT-033): GIVEN a month cell holds several comments with the same `d` (for example, legacy comments with `d: 0`), WHEN the user edits or deletes one of them, THEN only that comment changes and the others are kept. Code status: NOT SATISFIED (`deleteComment()` filters by `d` and removes every match; edit mode and list keys also use `d`).
- RESOLVED (RT-033): GIVEN comments exist across months in a grouped period, WHEN grouped comments are requested, THEN the result is the concatenated `{ m, d }` objects of the included months. Code status: SATISFIED at runtime; the store types still say `string[]`.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/budget.spec.ts` covers load, grouping, comments, persistence, and pending sync update.
- CONFIRMED: Budget store tests assert that rejected `idb.saveJsonFile()` calls propagate failure and do not update `budget`, `comments`, or pending sync counters.
- CONFIRMED: `src/views/__tests__/Budget.spec.ts` mounts `Budget.vue` and covers category/expense rows, Save disabled until an edit, pending row and navigation guard after an edit, the `setBudgetForYear()` payload, ignored negative values, and the RT-009 failed local queue write (error message, guard still pending, Save still available).

## Missing Tests / Coverage Gaps
- CONFIRMED: Required component, integration, and manual coverage levels for this feature are defined in `specs/testing-strategy.md` (RT-031); keep both in sync when closing a gap.
- CONFIRMED: Rendered `Budget.vue` tests cover editing, pending/navigation state, and save (`Budget.spec.ts`); the context menu (apply next, remove) and comments dialog are not rendered in tests.
- CONFIRMED: No tests for currency-converted budget totals.
- CONFIRMED: RT-033 test expectations (none implemented yet):
  - `src/stores/__tests__/budget.spec.ts`: change the comment fixtures from plain strings (`["note"]`, `["a", "b", "c"]`, `["ok"]`, `["existing"]`) to `{ m, d }` objects.
  - `src/stores/__tests__/budget.spec.ts`: loading plain-string comments yields `{ m: <string>, d: 0 }`; a mixed array keeps order, converts strings, and leaves objects (including their `d`) unchanged; `setBudgetForYear()` after a legacy load writes only `{ m, d }` objects; grouping concatenates `{ m, d }` objects across months.
  - Load-normalizer unit tests if the normalizer lives in `src/helpers/persistedShapes.ts`, following the existing `normalize*` helper tests.
  - New `src/components/__tests__/CommentsDialog.spec.ts`: add emits `{ m, d }` with numeric `d` and no author; edit changes `m` and keeps `d`; delete removes only the targeted comment; with two comments sharing `d: 0`, editing or deleting one leaves the other unchanged; saving an edit with empty text deletes only that comment; read-only mode renders each `m`.
- CONFIRMED: Budget store tests cover local queue write failure state preservation; `Budget.spec.ts` covers the failure message and pending UI.

## Product Questions
- RESOLVED: Local queue write failure is blocking. Show an error toast or dialog, keep budget edits pending, and do not mark the edit as saved.
- RESOLVED (RT-033): Comments keep text plus creation time (`{ m, d }`), with no author. Legacy plain strings are accepted on load as `{ m, d: 0 }` and rewritten in the object shape on the next save. See Product Contract.
