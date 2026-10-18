# Validation and Errors

Resolves RT-032. This document defines the default severity, presentation (toast or dialog), retry, and logging rules for validation and error states. Feature specs use it whenever the product has not defined a failure state, and may override it.

## Purpose and Precedence
- RESOLVED (RT-032): These rules are the default. A feature spec's `## Error Handling` section overrides them for the case it describes.
- RESOLVED (RT-032): An override must say that it overrides the default and name the rule it replaces (for example, "Overrides `validation-and-errors.md` Logging: console-only"). A feature spec that does not name an override follows this document.
- RESOLVED (RT-032): A failure state that no feature spec and no rule here covers is a product decision. Mark it `UNCLEAR` in the feature spec and add it to `specs/requirements-triage.md`. Do not invent a one-off presentation in code.

## Product Contract

### Severity
Every user-visible error or validation message has exactly one severity.

| Severity | Meaning | Examples |
| --- | --- | --- |
| `info` | Neutral confirmation or notice. Nothing failed. | Logged out, transaction deleted. |
| `success` | A user action completed. | Config saved. |
| `warn` | The action worked or the data is usable, but something is degraded or needs attention. | Sync conflict overwritten, missing exchange rate, stale balance. |
| `error` | An action failed or data could not be loaded or saved. | Local queue write failed, sync failed, value sync failed. |
| `blocking` | The user cannot continue until they choose a recovery action. | WebAuthn, provider login, or token refresh failure. |

- REQUIRED: A message with no severity is treated as `info`.
- REQUIRED: Use `error` only when the user's intended action did not complete or data was not saved. Use `warn` when the action completed or the data is usable.

### Presentation
- REQUIRED: Field validation errors appear inline next to the field and disable or block Save. They do not use toasts or dialogs.
- REQUIRED: `info`, `success`, and `warn` use a toast that closes on its own.
- REQUIRED: An `error` raised by a one-time action (a failed save, a failed value sync) uses a closable toast. The surface the user was working in stays open, keeps the values the user entered, and keeps any pending changes pending.
- REQUIRED: An `error` that describes a state that stays true until something changes (sync failed, invalid remote file) uses a persistent closable toast (`life: 0`) in a named `group`, so a repeat replaces the earlier toast instead of stacking. The toast is removed when the state is cleared.
- REQUIRED: A `warn` that describes ongoing missing or stale data (missing rates, missing source data) uses a visible inline indicator in the affected view and not only a toast, so it is still visible after the toast closes.
- REQUIRED: `blocking` uses a dialog with explicit recovery actions. A dialog is used only when the user must choose between actions. A failure that needs no choice uses a toast.
- REQUIRED: No failure may be silent. Every caught error either shows a message under these rules or is covered by a feature-spec override that says it is intentionally console-only.
- REQUIRED: Message text states what failed and what was kept (for example, "Changes are still queued locally"). It does not include stack traces, raw provider responses, tokens, or file contents. A provider-supplied message may be shown when it is user-safe, with a generic fallback otherwise.

### Retry
- REQUIRED: Retry is user-initiated by default. The app does not retry a failed action in a loop in the background unless a feature spec defines it.
- REQUIRED: A recoverable failure leaves the user a way to retry. This is the same surface kept open with the entered values, a visible retry control (sync status, auth dialog), or message text that tells the user to try again.
- REQUIRED: A failure never discards queued (`to_sync`) data, pending edits, local credentials, or IndexedDB contents. Actions that clear local credentials or provider tokens require an explicit user choice.
- REQUIRED: A failed write must not be reported as saved.

### Logging
- REQUIRED: Unexpected failures are logged with `console.error`. Handled degraded states (for example, a missing optional file) use `console.warn`. `console.log` is not used to report errors.
- REQUIRED: Logs must not contain tokens, credentials, WebAuthn credential material, or financial values from user files.
- REQUIRED: The logged value includes the error object, with enough context (operation or file name) to tell where it came from.
- REQUIRED: There is no remote telemetry or error reporting. Logging is local to the browser console.
- REQUIRED: Showing a toast does not replace logging of an unexpected failure. An unexpected failure is both shown and logged. An expected, user-correctable condition (a validation error, a cancelled prompt) is shown and not logged as an error.

## Approved Feature Overrides
These earlier decisions stay valid. They apply instead of the defaults above for the cases they name.

| Triage ID | Case | Override |
| --- | --- | --- |
| RT-002 | Sync failure | Persistent grouped error toast; retry from the sync status action. Matches the persistent-state rule. |
| RT-005 | Invalid remote file | Persistent error toast; the remote file is not overwritten until the user acts. Matches the persistent-state rule. |
| RT-009 | Local queue write failure | Error toast; surface stays open and edits stay pending. Matches the one-time-action rule. |
| RT-011 | Missing exchange rate | Partial total with inline indicator naming the affected currencies or accounts. Matches the ongoing-warn rule. |
| RT-012 | External value sync | One generic error for all providers; no per-row or per-provider detail. |
| RT-014 | Dashboard missing data | Read-only empty state, not an error. No error state until failed-load handling exists. |
| RT-018 | Settings retry-login | Error toast with the provider message if user-safe, otherwise a generic retry-later message. State is unchanged. |
| RT-020 | Authentication failures | `blocking` dialog with Retry, Reset local credentials, and Restart provider login. |
| RT-025 | Service-worker registration | Console-only; no user-facing message. |

## Observed Implementation
Current code traceability only. Nothing here is a requirement.

- CONFIRMED: `src/helpers/events.ts` exports `EVENTS` (a `tiny-emitter`). `src/App.vue` listens for `"message"` and calls PrimeVue `toast.add` with `severity` (default `info`), `summary`, `detail` (from `message`), `life` (default 3000), `closable`, and `group`. `CLEAR_MESSAGES` calls `toast.removeGroup`.
- CONFIRMED: Stores and helpers raise toasts through `EVENTS.emit("message", ...)` (`src/stores/storage.ts`, `src/helpers/files.ts`, `src/helpers/sync.ts`). The transaction dialogs, `Budget.vue`, `Values.vue`, and `Transactions.vue` use the same bus. `Accounts.vue` and `Settings.vue` call `useToast().add` directly.
- CONFIRMED: Sync failed (`storage.ts`) and invalid file (`files.ts`) emit `error` with `life: 0`, `closable: true`, and a `group` (`sync-failed`; `invalid-file:<fileName>`, cleared with `CLEAR_MESSAGES` when a later read of the file succeeds). Local save failures in the three transaction dialogs and `Budget.vue`, and the value sync failure in `Values.vue`, emit `error` with the default 3000 ms lifetime.
- CONFIRMED: Caught errors in `src/helpers/files.ts` (`writeJsonFile`), `src/helpers/storage/dropbox.ts` (token refresh), and `src/components/Auth.vue` (`reportWebauthnError`, `reportLoginError`) are logged with `console.error`; the unknown-file-prefix case in `Auth.vue` `syncCachedFiles` is a handled degraded state and uses `console.warn`. `console.error` is also used in `http_server.ts`, `pwa.ts`, `storage.ts` (online refresh), and `Settings.vue` (retry login).
- CONFIRMED (RT-044): The local save `catch` blocks in `TransactionEditDialog.vue`, `TransactionExpenseDialog.vue`, `TransactionTransferDialog.vue`, and `Budget.vue` log the caught error with `console.error` and show a toast.

### Contract status
| Rule | Status | Evidence |
| --- | --- | --- |
| Severity vocabulary and `info` default | satisfied | `App.vue` message handler. No test covers the default (see Test Expectations). |
| Inline field validation, no toast or dialog | satisfied | Transaction form `formErrors`; Accounts inline validation; covered by `TransactionEditDialog.spec.ts` and `AccountsClassAllocation.spec.ts`. |
| One-time `error` keeps the surface open and values/edits | satisfied | RT-009; `TransactionEditDialog.spec.ts`, `Budget.spec.ts`. |
| Persistent-state `error` is persistent, closable, and grouped | satisfied | Sync failed (`storage.spec.ts`) and invalid file, one group per file (`files.spec.ts`), are persistent, closable, and grouped. |
| Ongoing missing-data `warn` has an inline indicator | satisfied | RT-011; expense and investment summaries. |
| `blocking` uses a dialog with explicit actions | satisfied | RT-020; `Auth.spec.ts`, `storage.spec.ts`. |
| No silent failure | satisfied | Callers of `writeJsonFile` audited: `accounts` and `config` saves, account hide/restore (`Accounts.vue`), the seed writes (`storage.ts`, `Auth.vue`, RT-045), and sync show a message; covered by `storage.spec.ts` and `Auth.spec.ts`. |
| Retry is user-initiated, no background loop | satisfied | Sync is debounced and user-retried; no retry loops found. |
| Failure never discards queued data or credentials | satisfied | RT-002, RT-020; `sync.spec.ts`, `storage.spec.ts`. |
| Logging uses `console.error`/`console.warn`, not `console.log` | satisfied | `files.ts`, `dropbox.ts`, and `Auth.vue` use `console.error`/`console.warn`; covered by `files.spec.ts`, `dropbox.spec.ts`, `Auth.spec.ts`. |
| Unexpected failure is both shown and logged | satisfied for local saves (RT-044) | Transaction dialogs and `Budget.vue` show a toast and log with `console.error`; covered by `TransactionEditDialog.spec.ts`, `TransactionExpenseDialog.spec.ts`, `TransactionTransferDialog.spec.ts`, and `Budget.spec.ts`. |
| No secrets or user financial values in logs | satisfied | No log call found that writes a token or file contents; covered for the Dropbox token-refresh log (`dropbox.spec.ts`). |
| Message text is user-safe | satisfied | Existing messages are fixed strings or `StorageAuthError` messages; the Settings retry-login provider message is the only pass-through (RT-018). |

## Acceptance Criteria
- [x] REQUIRED: GIVEN a `"message"` event with no `severity`, WHEN it is handled, THEN a toast with severity `info` and a closing lifetime is shown.
- [x] REQUIRED: GIVEN a `"message"` event with `severity: "error"`, `life: 0`, `closable: true`, and a `group`, WHEN it is handled, THEN a persistent closable toast is added in that group, and `CLEAR_MESSAGES` for the group removes it.
- [ ] REQUIRED: GIVEN a one-time save fails, WHEN the error toast is shown, THEN the dialog or view stays open, the entered values and pending edits are kept, and nothing is marked saved.
- [ ] REQUIRED: GIVEN a state-based error (sync failed, invalid remote file) is raised twice, WHEN both are emitted, THEN one toast per group is visible.
- [ ] REQUIRED: GIVEN field validation fails, WHEN the user submits, THEN the error appears inline next to the field, Save is blocked, and no toast or dialog is shown.
- [x] REQUIRED: GIVEN an unexpected failure is caught, WHEN it is handled, THEN a user-visible message is shown and `console.error` is called with the error; `console.log` is not called for it.
- [x] RESOLVED (RT-045): GIVEN the seed write of `config.json` or `accounts.json` returns `false`, WHEN the seed is attempted, THEN an `error` toast is shown and the failure is logged with `console.error`.
- [ ] REQUIRED: GIVEN a failure of any kind, WHEN it is handled, THEN queued `to_sync` data, pending edits, and local credentials are unchanged unless the user chose a reset action.
- [x] REQUIRED: GIVEN a log call from an error path, WHEN its arguments are inspected, THEN they contain no token or credential value.
- [ ] REQUIRED: GIVEN a feature spec overrides a default, WHEN the spec is reviewed, THEN the override names the rule it replaces.

## Test Expectations
Follow the layers and conventions in `specs/testing-strategy.md`.

| Expectation | Layer | Location | Status |
| --- | --- | --- | --- |
| The `"message"` handler applies `info` and the default lifetime, forwards `group`/`closable`, and `CLEAR_MESSAGES` removes the group. | Component | `src/__tests__/App.spec.ts` | covered |
| Local-save failures keep the surface open and the edits pending, and emit `severity: "error"`. | Component | `TransactionEditDialog.spec.ts`, `Budget.spec.ts` | covered |
| Sync failed is persistent, closable, and grouped; clearing removes it. | Unit | `src/stores/__tests__/storage.spec.ts` | covered |
| Invalid file is persistent, closable, and grouped; recovery clears the group. | Unit | `src/helpers/__tests__/files.spec.ts` | covered |
| Caught errors are logged with `console.error` and not `console.log` (spy on `console`). | Unit/Component | `files.spec.ts`, `dropbox.spec.ts`, `Auth.spec.ts`, the transaction dialog specs, `Budget.spec.ts` | covered for `files.ts`, `dropbox.ts`, `Auth.vue`, and the transaction dialogs and `Budget.vue` (RT-044) |
| Error logs contain no token or credential value. | Unit | `dropbox.spec.ts`, `storage.spec.ts` | covered |

## Code Alignment Follow-Ups
These are the gaps between the contract and current code. This spec change does not fix them. Each needs its own task and must not change an approved override.
- None open.

## Migration / Compatibility
- RESOLVED (RT-032): This is a documentation decision. It changes no persisted file, data shape, or route.
- RESOLVED (RT-032): The follow-ups change log levels and toast attributes only, and must keep the approved overrides intact.
