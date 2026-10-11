# Specs

Balancer uses spec-driven development. The specs in this folder describe what the product must do. Code and tests follow the specs, not the other way around.

- Do not implement behavior that is not described in a spec. Even a one-line behavior change starts with a spec edit.
- If a spec is ambiguous, stop and record the question in `requirements-triage.md` before writing code.

## Where things live

| File | Purpose |
| --- | --- |
| `product-overview.md` | Product scope and highest-risk decisions. |
| `architecture.md` | App structure, storage, sync, and PWA behavior. |
| `data-model.md` | Persisted files, fields, and compatibility rules. |
| `validation-and-errors.md` | Default validation and error rules. Feature specs must name any rule they override. |
| `testing-strategy.md` | Test layers, conventions, Change Gate, and the per-feature coverage matrix. |
| `requirements-triage.md` | Open and resolved product decisions, numbered `RT-xxx`. |
| `spec-coverage.md` | Which specs exist and which code and tests they map to. |
| `feature-template.md` | Template for a new feature spec. |
| `features/<name>.md` | One spec per feature. The **Product Contract** is the requirement; **Observed Implementation** only traces the current code. |

## Making a change

Pick the size first. If you can't tell which size it is, treat it as the bigger one.

| Size | When | Spec change | PRs |
| --- | --- | --- | --- |
| **Fix** | Code breaks an existing Product Contract line. | None, except updating `Contract status` in Observed Implementation. | 1 (test and fix) |
| **Small change** | Changes the behavior of one existing feature. | Edit the existing `features/<name>.md`. | 1 (spec, test, and code together) |
| **New feature** | Adds a user-visible flow or a persisted file or field, or touches several specs. | New `features/<name>.md` from `feature-template.md`. | 2 or more (spec first, then implementation) |

### Fix

1. Find the `REQUIRED` or `RESOLVED` line in the Product Contract that the code breaks.
2. Write a failing test for that line. Cite its RT id in the test name if it has one.
3. Fix the code and update `Contract status` in Observed Implementation.

### Small change

1. **Record the decision.** Add the next free `RT-xxx` id to `requirements-triage.md` with the question, the answer, and its status. For a trivial change, one row in the summary table is enough.
2. **Edit the feature spec.** Add or change a `RESOLVED (RT-xxx)` line in the Product Contract and add a GIVEN/WHEN/THEN acceptance criterion. Update `data-model.md` or `validation-and-errors.md` only if the change affects them.
3. **Write the test, then the code**, in the same PR. The Change Gate in `testing-strategy.md` lets a small, local change proceed if it adds a test for the behavior it changes.
4. Update Observed Implementation and the feature's row in the `testing-strategy.md` matrix.

### New feature

1. **Spec PR (no code):**
   - Copy `feature-template.md` to `features/<name>.md`. Fill in Goal, Scope, Product Contract, and Acceptance criteria. Observed Implementation says "not implemented".
   - Mark every open decision `UNCLEAR` and open an `RT-xxx` item in `requirements-triage.md` for each one.
   - List the spec in `spec-coverage.md` and add its rows to the `testing-strategy.md` matrix, with required tests marked `GAP`.
   - Merge the spec once the `UNCLEAR` items that block implementation are resolved.
2. **Implementation PRs:** one per coherent slice, named after the RT id (for example, "Implement RT-040"). Each PR adds its tests first and changes its matrix rows from `GAP` to `COVERED`.

## Closing a decision

When an `RT-xxx` decision is made:

1. Record it in the listed spec locations as `RESOLVED (RT-xxx)` and remove the `UNCLEAR` marker.
2. Update the item's status in `requirements-triage.md`.
3. If it needs code, implement it as a fix or small change above.

## Before you finish

- Run the checks for the files you changed, as listed under "Validation rules" in `AGENTS.md`.
- Spec, tests, and code agree in the same PR: Product Contract, Observed Implementation, `Contract status`, the `testing-strategy.md` matrix, and the feature's `Missing Tests / Coverage Gaps`.
- Record results for any Manual checklist items the change affects in the PR description, as `testing-strategy.md` requires.
