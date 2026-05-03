# Feature: <name>

## Goal
- CONFIRMED: State the user/business problem in one sentence.

## Scope
In scope:
- CONFIRMED: List included user-visible behavior and data effects.

Out of scope:
- CONFIRMED: List tempting but intentionally excluded behavior.

## Current behavior
- CONFIRMED: Describe observed implemented behavior only.
- INFERRED: Mark behavior derived from code paths but not directly verified.
- UNCLEAR: Mark missing product intent or missing evidence.

## Desired behavior
- CONFIRMED: Describe the target product behavior when it is known.
- UNCLEAR: State product decisions still needed before implementation.

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
- [ ] GIVEN <initial state>, WHEN <user/system action>, THEN <observable outcome>.
- [ ] Include at least one negative/error case when the feature accepts input.
- [ ] Include persistence/sync expectations when the feature writes data.

## Test plan
- Unit:
- Integration:
- Manual:

## Product questions
- UNCLEAR: List decisions required from the product owner before the spec can be considered complete.
