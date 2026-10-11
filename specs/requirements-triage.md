# Requirements Triage

This triage lists the `UNCLEAR` markers that remain in `specs/` after the first batch (RT-001 to RT-032) was closed. The first batch was removed from this file because every item is now recorded as `RESOLVED`, `REQUIRED`, or `IMPLEMENTED` in the feature, data-model, and architecture specs. Its full text is in git history.

IDs continue from RT-033 so existing `RT-xxx` references in specs and tests stay unique. `specs/feature-template.md` also contains `UNCLEAR`, but only as marker instructions, so it is not listed.

When a decision is made, record it in the listed spec locations as `RESOLVED (RT-xxx)`, remove the `UNCLEAR` marker, and update the item's status here.

## Summary

| ID | Area | Spec locations | Question | Proposed answer | Bucket | Confidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RT-033 | Budget comments | `features/budget.md` Product Questions; `data-model.md` budget section | Should budget comments keep author/time metadata, or are plain strings enough? | Keep message plus creation time (`{ m, d }`), no author. Make it the documented shape and accept legacy plain strings on load. | Code change likely | High | Resolved |
| RT-034 | Legacy account types | `features/accounts.md` Product Questions; `data-model.md` `accounts.json` section | Should legacy account type strings be migrated, tolerated, or rejected on load? | Migrate a fixed alias list (`cash`, `SavingAccount`) in memory on load. Keep rejecting any other unknown type. | Code change likely | Medium | Open |
| RT-035 | Error UX consistency | `product-overview.md` Highest-Risk Product Decisions; `spec-coverage.md` Highest-Priority Product Owner Questions | Is error UX for sync, provider login, WebAuthn, and external value providers specified consistently? | Yes. Mark it resolved and point to RT-002, RT-012, RT-020, and `validation-and-errors.md`. | Document only | High | Resolved |
| RT-036 | Failed sync recovery | `spec-coverage.md` Missing Product Flows; `product-overview.md` Migration / Compatibility | What recovery applies when sync fails after local writes were accepted? | Already decided by RT-002 (and RT-020 for credentials). Mark it resolved. | Document only | High | Resolved |
| RT-037 | Generated service worker | `architecture.md` PWA Behavior | How is runtime service-worker behavior after VitePWA generation specified? | Already decided by RT-025 (build-output test plus console-only registration errors). Mark it resolved. | Document only | High | Resolved |

Two more open questions turned up during the review. They are not marked `UNCLEAR` in any spec yet, but they need the same kind of decision:

| ID | Area | Spec locations | Question | Proposed answer | Bucket | Confidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RT-038 | Quick-add transaction dialogs | `spec-coverage.md` Code Areas Without Specs and Recommended Next Specs | Are the top-bar Expense and Transfer quick-add dialogs a supported flow? | Yes. Spec them in `features/transaction-dialogs.md` and hold them to the same rules as `TransactionEditDialog`. | Document only (then tests) | Medium | Open |
| RT-039 | Unused worker sources | `spec-coverage.md` Code Areas Without Specs; `AGENTS.md` sensitive areas | Are `claims-sw.ts`, `prompt-sw.ts`, `worker.js`, and `workerImport.js` part of the product? | No. Mark them unused and out of scope; remove them in a separate cleanup task. | Document only | Medium | Open |

## RT-033: Budget comment shape and metadata

- **Unclear spec:** `specs/features/budget.md` asks "Should comment history preserve author/time metadata, or are plain strings sufficient?"
- **Current behavior:**
  - `src/components/CommentsDialog.vue` stores each comment as `{ m: <message>, d: Date.now() }`. It uses `d` as the list key and as the id for edit and delete. Editing changes `m` and keeps `d`, so `d` is the creation time.
  - `src/views/Budget.vue` (`addComments`) saves that array as-is into `comments[accountId][month]`. `budget_<year>.json` therefore stores objects, not strings.
  - `src/stores/budget.ts` types comments as `string[]` (`YearlyCommentsData`) and does no normalization on load.
  - `specs/data-model.md` documents the shape as `{ [monthNumber]: string[] }`.
  - The read-only popover in `src/views/Expenses.vue` renders `comment.m`, so a plain-string comment shows as an empty row.
  - No author is stored. The app is single-user per storage account.
- **Evidence:** `src/components/CommentsDialog.vue` (`addComment`, `updateComment`, `deleteComment`); `src/views/Budget.vue` (`addComments`); `src/stores/budget.ts`; `src/views/Expenses.vue` (read-only `CommentsDialog`); `specs/data-model.md` (`budget_<year>.json`); `src/stores/__tests__/budget.spec.ts` uses plain strings (`["note"]`, `["a", "b", "c"]`), which do not match what the UI writes. No test renders `CommentsDialog`.
- **Risk if left unclear:** The data-model spec, the store types, and the tests describe a shape the UI never writes. A change that follows the spec (for example, normalizing comments to strings) would drop the stored timestamps. Hand-edited or older files with plain strings show blank comments. Duplicate `d` values (two comments created in the same millisecond) would edit or delete both.
- **Proposed answer:**
  - REQUIRED: A budget comment is `{ m: string, d: number }`, where `m` is the text and `d` is the creation time in epoch milliseconds. `d` also identifies the comment within its cell.
  - REQUIRED: No author field. It can be added later as an optional field without breaking the shape.
  - REQUIRED: On load, a plain-string comment is read as `{ m: <string>, d: 0 }` (versionless compatibility, see RT-004). It is written back in the object shape on the next save of that year.
  - Update `specs/data-model.md`, the budget store types, and the budget tests to match. Add a `CommentsDialog` component test for add, edit, and delete.
- **Bucket / confidence:** Code change likely (types, a load normalizer, tests) / High.
- **Decision:** RESOLVED (RT-033). Accepted as proposed, with legacy plain strings read as `{ m: <string>, d: 0 }`. Because several legacy comments in one cell then share `d: 0`, `specs/features/budget.md` also requires that editing or deleting a comment changes only that comment. `specs/features/budget.md` (Product Contract, Acceptance Criteria, Missing Tests, Product Questions) and `specs/data-model.md` (`budget_<year>.json`) now carry `RESOLVED (RT-033)` instead of the `UNCLEAR` marker. Code status: partially satisfied. Remaining implementation: comment types in `src/stores/budget.ts`, a load normalizer, single-comment edit/delete in `src/components/CommentsDialog.vue`, updated `budget.spec.ts`, and a new `CommentsDialog.spec.ts`.

## RT-034: Legacy account type strings

- **Unclear spec:** `specs/features/accounts.md` asks "Should legacy account type strings be migrated, tolerated, or rejected during load?" `specs/data-model.md` says "No authoritative migration rule exists for legacy account type strings."
- **Current behavior:**
  - `src/stores/accounts.ts` validates every entry against `VALID_ACCOUNT_TYPES`. One entry with an unsupported `type` throws a recoverable `PersistedFileError` (`malformed_file`) for the whole `accounts.json`, and no accounts are loaded.
  - This already satisfies the REQUIRED (RT-005, RT-006) line in `features/accounts.md`, so the de-facto answer today is "reject".
  - `specs/data-model.md` still has a stale `INFERRED` line saying legacy types "may load but fail grouping". The code no longer does that.
  - Legacy strings did ship: before commit `5f1eddd` (RT-006), `public/accounts.json` seeded `"type": "cash"` and `"type": "SavingAccount"`. Any user whose `accounts.json` was seeded before that commit and never edited still has those values.
- **Evidence:** `src/stores/accounts.ts` (`VALID_ACCOUNT_TYPES` check, `PersistedFileError`); `src/stores/__tests__/accounts.spec.ts` ("rejects unsupported account type values without loading them into grouping state", which uses `"Cash Account"`); `git show 5f1eddd -- public/accounts.json`; `specs/data-model.md`; `specs/features/accounts.md`.
- **Risk if left unclear:** Users seeded before RT-006 get an invalid-file error and lose access to every account-based view (dashboard, transactions, expenses, investments, budget, balance) because of one seed entry. Rejection is the safe default for truly unknown data, but it is a poor outcome for values the app itself shipped. The stale `INFERRED` line also contradicts the code.
- **Proposed answer:**
  - REQUIRED: On load, map a fixed alias list to current `AccountType` values in memory: `cash` → `Cash`, `SavingAccount` → `BankAccount`. The list contains only strings the app itself shipped.
  - REQUIRED: The migrated value is persisted only when the user next saves `accounts.json`. Loading never writes the file.
  - REQUIRED: Any other unsupported type is still rejected as `malformed_file` (RT-005 behavior is unchanged).
  - Remove the stale `INFERRED` line in `specs/data-model.md`. Add store tests for each alias and keep the existing rejection test.
  - Alternative if migration is not wanted: keep "reject", record it as `RESOLVED (RT-034)`, and document the manual fix (edit the `type` values in `accounts.json`).
- **Bucket / confidence:** Code change likely (small alias map and tests) / Medium. The choice between migrating and rejecting is a product call.

## RT-035: Error UX consistency (stale marker)

- **Unclear spec:**
  - `specs/product-overview.md` (Highest-Risk Product Decisions) says error UX for sync, provider login, WebAuthn, and external value providers is not specified consistently.
  - `specs/spec-coverage.md` (Highest-Priority Product Owner Questions) says "External value providers remain UNCLEAR."
- **Current behavior:** Every area named there now has a decision and an implementation:
  - Sync failure: RT-002, a persistent grouped toast with retry from the sync status action.
  - Provider login, WebAuthn, and Dropbox token refresh: RT-020, a shared `status.authError` shown in the auth dialog with Retry, Reset local credentials, and Restart provider login.
  - External value providers: RT-012, one generic error with no per-provider detail.
  - Shared defaults and overrides: RT-032 in `specs/validation-and-errors.md`.
- **Evidence:** `specs/validation-and-errors.md` (override table rows RT-002, RT-012, RT-020, RT-025); `specs/features/values.md` ("Contract status: satisfied for RT-011, RT-012, and RT-013"); `specs/features/authentication.md` (RT-020 criteria); `src/views/__tests__/Values.spec.ts`; `src/components/__tests__/Auth.spec.ts`; `src/stores/__tests__/storage.spec.ts`.
- **Risk if left unclear:** Readers think error UX is still open and may build a one-off presentation. The specs contradict each other.
- **Proposed answer:** Replace both markers with `RESOLVED` lines that point to RT-002, RT-012, RT-020, and `specs/validation-and-errors.md`. The remaining code gaps (log levels, invalid-file toast group, `writeJsonFile` caller audit) are already listed under "Code Alignment Follow-Ups" in `validation-and-errors.md`. They are implementation tasks, not product decisions.
- **Bucket / confidence:** Document only / High.
- **Decision:** RESOLVED (RT-035). Accepted as proposed. `specs/product-overview.md` and `specs/spec-coverage.md` now carry `RESOLVED (RT-035)` / RT-012 references instead of the `UNCLEAR` markers.

## RT-036: Failed sync recovery after accepted local writes (stale marker)

- **Unclear spec:**
  - `specs/spec-coverage.md` (Missing Product Flows) has "UNCLEAR: Failed sync and retry recovery after local writes have been accepted."
  - `specs/product-overview.md` (Migration / Compatibility) says "Recovery flows for failed sync and lost WebAuthn credentials remain unspecified."
- **Current behavior:**
  - RT-002: pending `to_sync` records stay queued, a failed sync sets a shared sync-failed state with a persistent toast, and retry is user-initiated from the sync status action.
  - RT-024: queued edits survive offline periods and sync on reconnect.
  - RT-020: lost or failing local credentials are recovered with Reset local credentials and then Register Credentials, keeping provider tokens and queued data. `specs/features/authentication.md` and `spec-coverage.md` already record this as resolved.
- **Evidence:** `specs/features/storage-sync.md`; `src/helpers/sync.ts`; `src/helpers/__tests__/sync.spec.ts`; `src/stores/__tests__/storage.spec.ts`; `specs/validation-and-errors.md` ("Failure never discards queued data or credentials": satisfied).
- **Risk if left unclear:** Same as RT-035: a product decision looks open when it is not, and `product-overview.md` contradicts `features/authentication.md`.
- **Proposed answer:** Replace both markers with `RESOLVED` lines that point to RT-002, RT-020, and RT-024. If the product wants more than that (for example, a list of failed files, or discarding a single queued edit), open a new triage item for it.
- **Bucket / confidence:** Document only / High.
- **Decision:** RESOLVED (RT-036). Accepted as proposed. `specs/spec-coverage.md` and `specs/product-overview.md` now point to RT-002, RT-024, and RT-020 instead of the `UNCLEAR`/"unspecified" wording. Richer recovery (a failed-file list, discarding a queued edit) needs a new triage item.

## RT-037: Runtime behavior of the generated service worker (stale marker)

- **Unclear spec:** `specs/architecture.md` (PWA Behavior) says "Runtime service-worker behavior after VitePWA generation is only partially represented by source files; generated output is not part of these specs."
- **Current behavior:** RT-025 resolved this in `specs/features/pwa.md`:
  - Registration failure is console-only and never blocks startup.
  - A real `vite build` test checks the generated manifest, the precache list (`index.html` plus JS/CSS), and `cleanupOutdatedCaches`.
  - Update prompting is covered by RT-026.
  - Not covered: runtime behavior inside a real browser (install, activate, update swap). `specs/testing-strategy.md` assigns that to manual testing.
- **Evidence:** `specs/features/pwa.md` (RT-025, RT-026); `src/helpers/__tests__/pwa.spec.ts`; `src/helpers/__tests__/pwaBuild.spec.ts`; `vite.config.ts`; `specs/testing-strategy.md`.
- **Risk if left unclear:** Low. Readers may think generated output is untested and duplicate the work, or change `vite.config.ts` without noticing that `pwaBuild.spec.ts` guards it.
- **Proposed answer:** Replace the marker with "RESOLVED (RT-025): Generated output is specified by its observable result (manifest, precache, cache cleanup) and covered by `pwaBuild.spec.ts`; in-browser install/activate/update behavior is manual coverage per `testing-strategy.md`."
- **Bucket / confidence:** Document only / High.
- **Decision:** RESOLVED (RT-037). Accepted as proposed. `specs/architecture.md` now records the generated service worker as specified by its observable build output (RT-025) with in-browser behavior as manual coverage.

## RT-038: Top-bar quick-add transaction dialogs (not yet marked UNCLEAR)

- **Open question:** `specs/spec-coverage.md` says the Expense and Transfer dialogs "are not covered in detail because the main transaction view currently uses `TransactionEditDialog.vue`". It recommends a `transaction-dialogs.md` spec "if those components are still intended to be active".
- **Current behavior:** The dialogs are active.
  - `src/layout/AppTopbar.vue` renders `TransactionTypeDialog`. Its add action calls `transactionDialog.show()`.
  - `TransactionTypeDialog.vue` offers three buttons that open `TransactionExpenseDialog`, `TransactionTransferDialog`, or the generic `TransactionEditDialog`.
  - `specs/validation-and-errors.md` already lists the Expense and Transfer dialogs' `catch {}` blocks as follow-ups.
- **Evidence:** `src/layout/AppTopbar.vue`; `src/components/TransactionTypeDialog.vue`; `src/components/TransactionExpenseDialog.vue`; `src/components/TransactionTransferDialog.vue`; `src/layout/__tests__/AppTopbar.spec.ts` (covers only currency selection). No rendered test covers either quick-add dialog.
- **Risk if left unclear:** These are user-facing write paths into `transactions_<year>_<month>.json`, but no spec covers them. They may not follow RT-008 (fresh id on edit), RT-009 (blocking local queue failure), or the transaction validation rules, and nothing would detect it.
- **Proposed answer:** Treat them as a supported flow. Write `specs/features/transaction-dialogs.md` requiring the same validation, id, and local-queue failure rules as `TransactionEditDialog`. Then add component tests per `specs/testing-strategy.md`. If the product does not want them, remove the top-bar entry point instead.
- **Bucket / confidence:** Document only, then tests / Medium.

## RT-039: Unused service-worker and worker sources (not yet marked UNCLEAR)

- **Open question:** `src/claims-sw.ts`, `src/prompt-sw.ts`, `src/worker.js`, and `src/workerImport.js` are listed as sensitive in `AGENTS.md` and described "only at a high level" in `spec-coverage.md`. It is not stated whether they are part of the product.
- **Current behavior:**
  - `vite.config.ts` uses the generated service worker. The `injectManifest` options that would use `prompt-sw.ts` are commented out.
  - No source file imports `claims-sw.ts`, `prompt-sw.ts`, or `worker.js`. `worker.js` only imports `workerImport.js`.
- **Evidence:** `vite.config.ts` (commented `pwaOptions.srcDir`, `filename = 'prompt-sw.ts'`, `strategies = 'injectManifest'`); the search `grep -rln "claims-sw\|prompt-sw\|workerImport\|worker.js" src vite.config.ts` finds only `src/worker.js` and `vite.config.ts`.
- **Risk if left unclear:** Contributors may edit or test files that never run, or assume custom service-worker logic exists. That conflicts with the RT-025 statement that generated output is the contract.
- **Proposed answer:** Record them as unused examples and out of scope in `specs/architecture.md` and `spec-coverage.md`. Remove them, and the commented config, in a separate cleanup task if the product agrees.
- **Bucket / confidence:** Document only / Medium.
