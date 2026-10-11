# AGENTS.md

## Purpose
This repository contains the Balancer application built with Vue 3, TypeScript, and Vite.

## Tech stack
- Vue 3
- TypeScript
- Vite
- Vitest
- ESLint
- Pinia
- Vue Router
- PrimeVue / PrimeFlex
- Chart.js

## Package manager
- Use `npm`.
- Prefer the existing `package-lock.json`.
- Do not switch package managers.

## Node version
- Use Node `v22.16.0` for this project.
- Before running checks/build/tests, run: `source ~/.nvm/nvm.sh && nvm use v22.16.0`.
- If `.nvmrc` exists, keep it aligned with the required Node version.

## Working agreements
- Prefer the smallest safe change that solves the task.
- Follow existing patterns in nearby files before introducing new abstractions.
- Keep diffs focused and easy to review.
- Do not rename, move, or reorganize files unless required by the task.
- Avoid unrelated cleanup or formatting-only changes.
- Do not edit generated output directly.
- Do not modify deployment or release behavior unless explicitly asked.
- Do not add new production dependencies unless necessary for the task.

## Spec-driven workflow
This section is the single source for how changes enter the specs.

- Product behavior is defined in `specs/`. Code and tests follow the specs.
- Read the relevant specs before changing code.
- Do not implement behavior that is not described in a spec. Even a one-line behavior change starts with a spec edit.
- If a spec is ambiguous, stop and list the questions, or record them in `specs/requirements-triage.md`.
- Add or update tests before implementation when possible.

### Spec files
| File | Purpose |
| --- | --- |
| `specs/product-overview.md` | Product scope and highest-risk decisions. |
| `specs/architecture.md` | App structure, storage, sync, and PWA behavior. |
| `specs/data-model.md` | Persisted files, fields, and compatibility rules. |
| `specs/validation-and-errors.md` | Default validation and error rules. Feature specs must name any rule they override. |
| `specs/testing-strategy.md` | Test layers, conventions, Change Gate, and the per-feature coverage matrix. |
| `specs/requirements-triage.md` | Open and resolved product decisions, numbered `RT-xxx`. |
| `specs/spec-coverage.md` | Which specs exist and which code and tests they map to. |
| `specs/feature-template.md` | Template for a new feature spec. |
| `specs/features/<name>.md` | One spec per feature. The **Product Contract** is the requirement; **Observed Implementation** only traces the current code. |

### Change size
Pick the size first. If you can't tell which size it is, treat it as the bigger one.

| Size | When | Spec change | PRs |
| --- | --- | --- | --- |
| **Fix** | Code breaks an existing Product Contract line. | None, except updating `Contract status` in Observed Implementation. | 1 (test and fix) |
| **Small change** | Changes the behavior of one existing feature. | Edit the existing `specs/features/<name>.md`. | 1 (spec, test, and code together) |
| **New feature** | Adds a user-visible flow or a persisted file or field, or touches several specs. | New `specs/features/<name>.md` from `specs/feature-template.md`. | 2 or more (spec first, then implementation) |

### Fix
1. Find the `REQUIRED` or `RESOLVED` line in the Product Contract that the code breaks.
2. Write a failing test for that line. Cite its RT id in the test name if it has one.
3. Fix the code and update `Contract status` in Observed Implementation.

### Small change
1. **Record the decision.** Add the next free `RT-xxx` id to `specs/requirements-triage.md` with the question, the answer, and its status. For a trivial change, one row in the summary table is enough.
2. **Edit the feature spec.** Add or change a `RESOLVED (RT-xxx)` line in the Product Contract and add a GIVEN/WHEN/THEN acceptance criterion. Update `specs/data-model.md` or `specs/validation-and-errors.md` only if the change affects them.
3. **Write the test, then the code**, in the same PR. The Change Gate in `specs/testing-strategy.md` lets a small, local change proceed if it adds a test for the behavior it changes.
4. Update Observed Implementation and the feature's row in the `specs/testing-strategy.md` matrix.

### New feature
1. **Spec PR (no code):**
   - Copy `specs/feature-template.md` to `specs/features/<name>.md`. Fill in Goal, Scope, Product Contract, and Acceptance criteria. Observed Implementation says "not implemented".
   - Mark every open decision `UNCLEAR` and open an `RT-xxx` item in `specs/requirements-triage.md` for each one.
   - List the spec in `specs/spec-coverage.md` and add its rows to the `specs/testing-strategy.md` matrix, with required tests marked `GAP`.
   - Merge the spec once the `UNCLEAR` items that block implementation are resolved.
2. **Implementation PRs:** one per coherent slice, named after the RT id (for example, "Implement RT-040"). Each PR adds its tests first and changes its matrix rows from `GAP` to `COVERED`.

### Closing a decision
1. Record it in the listed spec locations as `RESOLVED (RT-xxx)` and remove the `UNCLEAR` marker.
2. Update the item's status in `specs/requirements-triage.md`.
3. If it needs code, implement it as a fix or small change above.

### Spec checks before finishing
- Spec, tests, and code agree in the same PR: Product Contract, Observed Implementation, `Contract status`, the `specs/testing-strategy.md` matrix, and the feature's `Missing Tests / Coverage Gaps`.
- Record results for any Manual checklist items the change affects in the PR description, as `specs/testing-strategy.md` requires.
- Summarize changed files and remaining risks.

## Project structure
- Main application entry: `src/main.ts`
- Root app component: `src/App.vue`
- Views/pages: `src/views/`
- Reusable UI components: `src/components/`
- State management: `src/stores/`
- Routing: `src/router/`
- Composables: `src/composables/`
- Helpers/utilities: `src/helpers/`
- Plugins: `src/plugins/`
- Shared types: `src/types.ts`
- Specs: `specs/`
- Static/public assets: `public/`
- Server-related code: `server/`

## Generated and build output
Treat these as generated output and do not edit them directly:
- `dist/`
- `dev-dist/`

## Sensitive areas
Use extra care when changing:
- `src/stores/` for shared state behavior
- `src/router/` for navigation and route structure
- `src/helpers/` for core data transformations
- `server/` for local/server-side behavior
- service worker or worker-related files:
  - `src/claims-sw.ts`
  - `src/prompt-sw.ts`
  - `src/worker.js`
  - `src/workerImport.js`
- `vite.config.ts` for build, PWA, and deployment behavior

## Commands
Use the repository scripts exactly as defined:

- Dev server: `npm run dev`
- Preview: `npm run preview`
- HTTPS preview: `npm run https-preview`
- Build: `npm run build`
- Tests: `npm run test`
- Type check: `npm run type-check`
- Lint: `npm run lint`

## Validation rules
Run the smallest relevant checks for the change:

- For TypeScript, Vue logic, stores, helpers, composables, or routing changes:
  - `npm run type-check`
  - `npm run test`

- For UI/component/view changes:
  - `npm run lint`
  - `npm run type-check`

- For build config, worker, plugin, or deployment-related changes:
  - `npm run build`
  - `npm run type-check`
  - `npm run test`

Before finishing, run all checks relevant to the files changed.

## Important command notes
- `npm run release` updates the package version, builds with `--base=/balancer/`, and publishes with `gh-pages`. Do not run `npm run release` unless explicitly asked.
- `npm run build` and preview-related commands may regenerate output in `dist/` or related folders.

## Coding conventions
- Match the style and structure already used in nearby files.
- Prefer existing helpers, composables, stores, and plugins over introducing new patterns.
- Keep components focused and readable.
- Preserve public behavior unless the task explicitly requests a behavior change.
- Add or update tests when behavior changes.
- Update README or relevant docs when developer workflow or project behavior changes.

## Change policy
- Prefer targeted edits over broad refactors.
- Avoid touching unrelated files.
- Avoid changing lockfiles unless dependency changes are required.
- Avoid changing version numbers unless explicitly requested.
- When a task may affect multiple areas, propose a brief plan before making broad changes.

## Definition of done
A task is complete only when:
1. The requested change is implemented.
2. Relevant validation has been run, or blockers are clearly stated.
3. Tests are added or updated when behavior changes.
4. The diff contains only task-relevant changes.
