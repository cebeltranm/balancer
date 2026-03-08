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

## Working agreements
- Prefer the smallest safe change that solves the task.
- Follow existing patterns in nearby files before introducing new abstractions.
- Keep diffs focused and easy to review.
- Do not rename, move, or reorganize files unless required by the task.
- Avoid unrelated cleanup or formatting-only changes.
- Do not edit generated output directly.
- Do not modify deployment or release behavior unless explicitly asked.
- Do not add new production dependencies unless necessary for the task.

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