# Feature: Budget

## Goal
- CONFIRMED: Maintain yearly monthly expense budgets and comments.

## Current Implemented Behavior
- CONFIRMED: `/settings/budget` maps to `src/views/Budget.vue`.
- CONFIRMED: The view displays expense accounts grouped under category rows, with 12 editable monthly columns.
- CONFIRMED: Users can edit monthly budget cells, apply a month value to subsequent months, remove a month value, and add comments.
- CONFIRMED: Edited rows are marked pending and the router pending-change flag is emitted.
- CONFIRMED: Saving writes `{ values, comments }` to `budget_<year>.json` in IndexedDB cache with `to_sync: true`.
- CONFIRMED: Budget totals convert currencies through `valuesStore.joinValues()`.

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
- UNCLEAR: Failed IndexedDB save or later sync failure is not surfaced by the view.

## Edge Cases
- CONFIRMED: Category rows are not directly editable.
- CONFIRMED: Missing budget months are treated as `null`/zero in display and grouping.
- CONFIRMED: `FORM_WITH_PENDING_EVENTS` blocks navigation while unsaved budget edits are pending.
- INFERRED: Save does not clear the pending form event directly; store watcher recalculation resets it after store update.

## Acceptance Criteria
- CONFIRMED: GIVEN a yearly budget file is loaded, WHEN `values` or `comments` are missing, THEN the store treats the missing section as an empty object.
- CONFIRMED: GIVEN monthly values exist for a quarter or year, WHEN grouped budget data is requested, THEN the grouped value equals the sum of included months.
- CONFIRMED: GIVEN comments exist across months in a grouped period, WHEN grouped comments are requested, THEN the result concatenates the included month comment arrays.
- CONFIRMED: GIVEN pending budget edits exist, WHEN the user saves, THEN `budget_<year>.json` is staged in IndexedDB with `to_sync: true` and pending sync counters are updated.
- CONFIRMED: GIVEN unsaved budget edits exist, WHEN the user navigates away, THEN the pending-form route guard blocks navigation.
- UNCLEAR: The product response for failed local save or later sync failure is not specified.

## Existing Tests Related To This Feature
- CONFIRMED: `src/stores/__tests__/budget.spec.ts` covers load, grouping, comments, persistence, and pending sync update.

## Missing Tests / Coverage Gaps
- CONFIRMED: No rendered `Budget.vue` tests for editing, context menu, comments dialog, or navigation blocking.
- CONFIRMED: No tests for currency-converted budget totals.

## Product Questions
- UNCLEAR: Should budget edits autosave, warn, or discard when a later sync upload fails?
- UNCLEAR: Should comment history preserve author/time metadata, or are plain strings sufficient?
