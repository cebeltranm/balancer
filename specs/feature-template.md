# Feature: <name>

## Goal
- CONFIRMED: State the user/business problem in one sentence.

## Scope
In scope:
- CONFIRMED: List included user-visible behavior and data effects.

Out of scope:
- CONFIRMED: List tempting but intentionally excluded behavior.

## Product Contract
Intended behavior that must survive refactors. Anything not listed here is not a product requirement, even if the code currently does it.
- REQUIRED: Describe the target product behavior in observable terms (no file, function, or component names).
- RESOLVED (RT-xxx): Record a product decision and the triage ID that settled it.
- UNCLEAR: State product decisions still needed before implementation. Remove or replace this marker once the decision is made.

## Observed Implementation
Current code traceability only. Nothing here is a requirement; if it conflicts with the Product Contract, the code is a bug or a pending product decision.
- CONFIRMED: Describe observed implemented behavior, naming files, functions, and tests.
- INFERRED: Mark behavior derived from code paths but not directly verified.
- Contract status: State for each Product Contract item whether current code satisfies it (`satisfied`, `partially satisfied`, or `not satisfied`) and which tests cover it.

## API / CLI / UI contract
- CONFIRMED: Name routes, controls, visible states, emitted events, files, commands, or response shapes that tests can observe.

## Data model changes
- CONFIRMED: Describe exact file names, field names, allowed values, defaults, and migration expectations.
- UNCLEAR: Mark compatibility or migration decisions that are not specified.

## Validation rules
- CONFIRMED: List each rule with the invalid input and expected user/system response.

## Error handling
- CONFIRMED: List each recoverable error and expected user-visible state.
- UNCLEAR: Mark errors that are logged or swallowed without a specified user experience.

## Security / permissions
- CONFIRMED: Describe route gates, provider permissions, local credential behavior, and sensitive storage expectations.

## Observability
- CONFIRMED: List expected logs, toasts, counters, test hooks, or telemetry if applicable.
- UNCLEAR: State when no observability requirement exists.

## Acceptance criteria
- [ ] REQUIRED: GIVEN <initial state>, WHEN <user/system action>, THEN <observable outcome>. Criteria derive from the Product Contract, not from Observed Implementation.
- [ ] Include at least one negative/error case when the feature accepts input.
- [ ] Include persistence/sync expectations when the feature writes data.

## Test plan
Required coverage levels and conventions are defined in `specs/testing-strategy.md`; add this feature's row to its matrix.

- Unit:
- Integration:
- Manual:

## Product questions
- UNCLEAR: List decisions required from the product owner before the spec can be considered complete.
