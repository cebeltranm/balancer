# Implementation Plan

This plan lists every place where the specs and the code or tests do not yet agree, after all triage decisions (RT-001 to RT-048) were recorded in the specs. It orders the work into sessions that can each be done and reviewed as one PR.

It is a work list, not a requirement. The requirement is always the Product Contract in the cited spec. When an item is done, update the cited spec (`Contract status`, `Missing Tests / Coverage Gaps`, acceptance-criteria checkboxes) and the `specs/testing-strategy.md` matrix in the same PR, as `AGENTS.md` requires, and remove the item from this plan.

## Legend

- **Type**
  - `Code` – a `REQUIRED` or `RESOLVED` contract line that the code does not satisfy. Follows the **Fix** flow in `AGENTS.md`: failing test first, then the code.
  - `Test` – the code satisfies the contract, but a test that `specs/testing-strategy.md` marks `GAP` (REQUIRED) or that a spec explicitly requires is missing.
  - `Test (rec.)` – a `RECOMMENDED` test. Not required by the Change Gate.
  - `Spec` – a spec line is stale or contradicts another spec. Documentation only.
- **Priority**
  - `P1` – a contract line is broken, or a REQUIRED gap blocks the Change Gate of a feature that is likely to change next.
  - `P2` – a REQUIRED test gap or a REQUIRED code-alignment follow-up with low user impact.
  - `P3` – recommended coverage, or spec hygiene.
- **Complexity**
  - `S` – under ~2 hours: one or two files, an existing test pattern to copy.
  - `M` – half a day: several files, or a new stub/mocking setup (for example, PrimeVue `ContextMenu`, charts).
  - `L` – a day or more: crosses several stores or needs a new integration harness.

## Summary

| ID | Item | Spec source | Type | Priority | Complexity | Session |
| --- | --- | --- | --- | --- | --- | --- |
| IMP-18 | Values: save triggers balance recalculation | `features/values.md` | Test | P2 | S | 5 |
| IMP-19 | Values: manual editing and pending-row indication | `features/values.md` | Test | P2 | M | 5 |
| IMP-20 | Budget: context menu apply-next and remove mark the row pending | `features/budget.md` | Test | P2 | M | 5 |
| IMP-21 | Expenses: budget progress and comment popover | `features/expenses.md` | Test | P2 | M | 5 |
| IMP-22 | Investments: ByRegion Unknown bucket; fully allocated account has no Unknown (RT-017) | `features/investments.md` | Test | P2 | S | 5 |
| IMP-23 | Investments: table and bar views render missing-rate indicators (RT-011) | `features/investments.md` | Test | P2 | M | 5 |
| IMP-24 | Values and balance offline queue (RT-024) | `features/pwa.md` | Test | P3 | S | 6 |
| IMP-25 | Balance: formulas across account types; multi-month recursive recalculation | `features/balance.md` | Test (rec.) | P3 | M | 6 |
| IMP-26 | Local dev server: `/list`, write, and `.tmp/` creation failures return 500 | `features/local-dev-server.md` | Test (rec.) | P3 | M | 6 |
| IMP-27 | Integration: transaction edit → balance recalculation | `testing-strategy.md` Transactions | Test (rec.) | P3 | M | 7 |
| IMP-28 | Integration: auth startup refresh → sync → balance → store reloads | `testing-strategy.md` Storage Sync | Test (rec.) | P3 | L | 7 |
| IMP-29 | Remove stale and contradictory spec lines | several | Spec | P3 | S | 8 |

## Sessions

Sessions are in the suggested order. Each session is one PR. Sessions 5–7 only add tests and can be done in any order or skipped until the feature changes; the Change Gate in `specs/testing-strategy.md` forces the related REQUIRED rows to be closed before a broad change to that feature anyway. Session 8 can be done at any time.

### Session 5 — Report and editor views coverage (P2)

Why grouped: all are rendered-view tests on data-heavy screens that share the same store mocks (accounts, values, balance, budget). Needs stubs for PrimeVue `ContextMenu` and the chart components, so it is heavier than the earlier component-gap sessions. Can be split into 5a (Values, Budget) and 5b (Expenses, Investments) if the PR gets large.

Suggested PR title: "Close REQUIRED component gaps for Values, Budget, Expenses, and Investments".

- **IMP-18 (S).** `src/views/__tests__/Values.spec.ts`: saving calls `balanceStore.recalculateBalance(year, month, true)` (`Values.vue:579`).
- **IMP-19 (M).** `Values.spec.ts`: an inline edit to a non-negative changed value marks the row pending; a negative or unchanged value does not.
- **IMP-20 (M).** `src/views/__tests__/Budget.spec.ts`: context menu "apply next" copies the month value to later months and marks the row pending; "remove" clears the month and marks the row pending.
- **IMP-21 (M).** New `src/views/__tests__/ExpensesBudget.spec.ts`: a budget progress bar renders only when a budget exists for the row/period; the comment badge opens the read-only comments with the concatenated `{ m, d }` comments.
- **IMP-22 (S).** `src/views/__tests__/PortfolioUnknownAllocation.spec.ts`: ByRegion groups a legacy account under Unknown with the warning; a fully allocated account never creates an Unknown bucket. Also fix the wording in `features/investments.md` (it asks for an `investments.spec.ts`-level test while the matrix asks for component level; the Unknown bucket is built in `views/portafolio/index.vue`, so component level is right).
- **IMP-23 (M).** Rendered `table.vue` and `bar.vue` with summary metadata that has a missing rate show the missing-rate indicator naming the currency/account.
- Manual checklist to run and record: "Charts and Overlays" (Expenses charts, Portfolio charts, Budget context menu and comments dialog).

### Session 6 — Store-level recommended coverage (P3)

Suggested PR title: "Add recommended store and dev-server coverage".

- **IMP-24 (S).** `src/stores/__tests__/values.spec.ts` and `balance.spec.ts`: an offline save stays queued (`to_sync: true` for values; balance cached only, per RT-024) and the pending counters reflect it. Called out as missing in `features/pwa.md`.
- **IMP-25 (M).** `balance.spec.ts`: recalculation results for each account type (cash, bank, credit card, loan, receivable/payable, income, expense, property, investment with units), and recalculating an earlier month updates every later month through the current month.
- **IMP-26 (M).** `src/helpers/__tests__/localDevServer.spec.ts`: `/list` and JSON write filesystem failures return 500 JSON; a `.tmp/` creation failure on `/list`/write returns 500. Needs a way to force the failure in the child process (for example, a read-only temp root).

### Session 7 — Cross-store integration flows (P3)

Suggested PR title: "Add recommended integration flows".

- **IMP-27 (M).** Real `transactions` and `balance` stores with mocked storage: editing a transaction (delete original + save new id), then sync, recalculates balances from the earliest changed month.
- **IMP-28 (L).** `Auth.vue` startup refresh with stale cached files → `syncCachedFiles` reload → sync → balance recalculation → stores reloaded. This flow currently runs refreshes with `forEach(async …)` (see "Needs a product decision" below), so the test must wait on observable results, not on the outer promise.

### Session 8 — Spec hygiene (P3, any time)

Documentation only; no code or tests. Can be folded into whichever session touches the file.

- **IMP-29 (S).** Fix lines that are stale or contradict other specs:
  - `features/storage-sync.md`: Observed Implementation says "Google Drive test coverage is still missing" and Product Questions says "Test coverage for it is not yet present", but Missing Tests records it as implemented in `storageIndex.spec.ts`.
  - `features/settings.md`: Error Handling has "CONFIRMED (current code, gap): `retryLogin()` … only handles a truthy result … Code status: SATISFIED", which contradicts itself; and the RT-018 criterion "(no toast is shown for any failure today)".
  - `features/authentication.md`: "Partial building blocks exist" duplicates the satisfied RT-020 line.
  - `product-overview.md` "Known risks": "no clear live stock-price fetch path was identified" contradicts `features/values.md` (AlphaVantage, MarketStack, RapidAPI); "service-worker source files include multiple variants" contradicts RT-039 in `architecture.md`.
  - `testing-strategy.md` "Priority For Closing Gaps": replace with a pointer to this plan so there is one ordered list.
  - `spec-coverage.md` and `validation-and-errors.md` still mention `specs/requirements-triage.md`; that is fine now that `AGENTS.md` says the file is created when a new decision is opened.

## Needs a product decision before implementation

These are known issues or ideas that no Product Contract line requires. Per `AGENTS.md`, do not change code for them until a spec says so. Open RT-049 onward in `specs/requirements-triage.md` for any you want to pursue.

| Topic | Where it is mentioned | Question to decide | Suggested size |
| --- | --- | --- | --- |
| `syncCachedFiles()` uses `forEach(async …)` | `product-overview.md` Known risks; `Auth.vue:381` | Must startup refresh finish (all reloads awaited) before startup sync and balance work start? | Small change (authentication or storage-sync spec) |
| `checkStore()` only on interactive login | `features/authentication.md` RT-023 | Should a missing `accounts.json` be re-seeded on a later load? Currently an accepted gap. | Small change |
| Invalid-file recovery action | `data-model.md` ("until the user explicitly chooses a recovery action"; "recovery UI polish remains future work") | What recovery actions exist (reload from remote, discard local cache, open file in provider)? Today there is only the persistent toast. | New feature |
| Base currency setting | `features/authentication.md` RT-023 | Out of scope by design; needs its own requirement and data-model change. | New feature |
| Google Drive provider | `features/storage-sync.md` RT-029 | Out of scope until a provider helper, auth flow, and sync tests exist. | New feature |
| Automated end-to-end tests | `testing-strategy.md` RT-031 | Out of scope; adding a tool needs a decision and a dependency. | New feature |
| Missing specs | `spec-coverage.md` "Recommended Next Specs To Write" | Write `selectors-and-shared-components.md`, `compatibility.md`, `sync-conflicts.md`, `security.md`? These describe existing behavior, so they are spec-only PRs. | Spec only |

## Already satisfied (no action)

Every recorded decision from RT-001 to RT-048 is satisfied in code. The only open work is the test coverage and follow-ups listed above. RT-004 and RT-022 are not referenced by any spec.
