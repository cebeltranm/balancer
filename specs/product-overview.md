# Product Overview

## What the app does

Balancer is a personal finance web application for tracking expenses, accounts, balances, budgets, asset values, and investments. It runs as a Vue 3 single-page app and stores user data as JSON files in a selectable storage backend, with Dropbox as the normal provider and a local HTTP file server available for local development.

The app supports:

- Dashboard summaries for current expenses, credit cards, cash, bank accounts, and receivables.
- Transaction entry, editing, deletion, tagging, and monthly transaction loading.
- Expense reporting by category and period.
- Account management for cash, bank, credit card, loan, receivable/payable, income, expense, property, and investment account types.
- Budget and budget-comment management by year and period.
- Currency and asset value tracking, including fallback lookups across recent months and USD cross-rates.
- Balance calculation across accounts and months, including recursive recalculation of future balances when an earlier month changes.
- Portfolio/investment views grouped by asset class, region, instrument type, account type, and expected composition.
- Storage authentication, local device authentication, logout, cache refresh, and PWA update prompts.

## Main modules, routes, and jobs

### Application shell

- `src/main.ts` creates the Vue app, installs Vue Router, Pinia, PrimeVue, PrimeVue services/directives/components, Google Charts, and the global formatter.
- `src/App.vue` defines the layout shell, navigation menu, service-worker update toast, authentication dialog, logout confirmation, and startup sync checks.
- `src/layout/AppTopbar.vue` and `src/layout/AppMenu.vue` provide the main navigation UI.

### Routes and views

Routes are defined in `src/router/index.ts`:

- `/` -> `HomeView.vue`: current dashboard/account-value summaries.
- `/Transactions` -> `Transactions.vue`: transaction management.
- `/expenses` -> `Expenses.vue`: expense reporting.
- `/assets` -> `Assets.vue`: asset/account overview, requires authentication.
- `/investments` -> `views/portafolio/index.vue`: portfolio analytics, requires authentication.
- `/settings/values` -> `Values.vue`: yearly/monthly asset and currency values.
- `/settings/budget` -> `Budget.vue`: budget values and comments.
- `/settings/general` -> `Settings.vue`: storage status, stock API config, target portfolio composition, requires authentication.
- `/balance` -> `Balance.vue`: balance reporting, requires authentication.
- `/settings/accounts` -> `Accounts.vue`: account configuration, requires authentication.

The router also blocks navigation while forms report pending changes and emits an authentication check for all routes except `/` and `/expenses`.

### Stores

- `src/stores/storage.ts`: selected storage provider, login/logout, store status, pending IndexedDB sync counters, and serialized sync execution.
- `src/stores/accounts.ts`: account loading, saving, deleting, active-account filtering, expense category trees, and account grouping.
- `src/stores/transactions.ts`: monthly transaction loading, pending IndexedDB merge, save/delete queueing, and recent tag discovery.
- `src/stores/balance.ts`: yearly balance loading, grouped period balances, current-month balance assurance, and balance recalculation.
- `src/stores/budget.ts`: yearly budget and comment loading/saving plus grouped period aggregation.
- `src/stores/values.ts`: yearly value loading, current-month value bootstrapping, currency/asset value lookup, and value conversion.
- `src/stores/config.ts`: app config, stock API settings, and investment-composition grouping.

### Helpers

- `src/helpers/files.ts`: storage-backed JSON reads/writes with IndexedDB cache updates.
- `src/helpers/idb.ts`: local IndexedDB database named `balancer`, with `transactions` and `files` object stores.
- `src/helpers/sync.ts`: syncs queued transactions into monthly JSON files and uploads cached files marked `to_sync`.
- `src/helpers/storage/index.ts`: selects Dropbox, local HTTP server, or planned Google Drive provider.
- `src/helpers/storage/dropbox.ts`: Dropbox OAuth, token refresh, JSON file read/write, metadata, and listing.
- `src/helpers/storage/http_server.ts`: local development storage client for `http://localhost:8181`.
- `src/helpers/groupData.ts`, `src/helpers/options.ts`, `src/helpers/investments.ts`, `src/helpers/date.ts`, and related files provide period grouping, date handling, option helpers, and investment transformations.

### Local server routes

`server/index.js` is a local Express server for development storage against `.tmp/`:

- `GET /_ping`: health check.
- `POST /auth/login`: returns a fixed local development bearer token.
- `GET /auth/session`: validates the bearer token.
- `GET /list`: lists JSON files in `.tmp/` with modification times.
- `POST /*.json`: writes request JSON into `.tmp/<file>.json`.
- Static file serving from `.tmp/`, protected by the same bearer token.

### Background jobs and worker behavior

- `src/helpers/pwa.ts` registers the service worker immediately and checks for service-worker updates every 120 seconds when `__RELOAD_SW__` is replaced with `"true"`.
- `src/claims-sw.ts` and `src/prompt-sw.ts` precache app assets, clean outdated caches, and register an app-shell navigation fallback to `index.html`.
- `src/App.vue` checks pending local sync work on mount.
- `src/components/Auth.vue` loads basic files after login, seeds `accounts.json` from `public/accounts.json` if missing, refreshes stale cached files from remote storage, ensures current-month values/balance exist, and preloads recent transactions.
- `src/stores/storage.ts` debounces full sync work and serializes explicit sync operations.
- `src/worker.js` is a small sample/test worker responding to `ping` and `clear`; it does not appear to drive core product behavior.

## External dependencies

Runtime dependencies:

- Vue stack: `vue`, `vue-router`, `pinia`, `@vueuse/core`.
- UI and styling: `primevue`, `@primevue/forms`, `@primeuix/themes`, `primeflex`, `primeicons`, `roboto-fontface`, `material-design-icons-iconfont`.
- Charts and visualization: `chart.js`, `vue-google-charts`.
- Storage and data: `dropbox`, `idb`, `lodash-es`, `tiny-emitter`, `zod`.
- Fonts/i18n utilities: `webfontloader`, `vue-intl`.

Development/build dependencies:

- Build tooling: `vite`, `@vitejs/plugin-vue`, `typescript`, `vue-tsc`, `vite-plugin-pwa`, `@rollup/plugin-replace`.
- Testing: `vitest`, `jsdom`.
- Linting: `eslint`, `@eslint/js`, `eslint-plugin-vue`, `@vue/eslint-config-typescript`, `@vue/eslint-config-prettier`, `@rushstack/eslint-patch`.
- Local server and deployment tooling: `express`, `cors`, `https-localhost`, `serve`, `gh-pages`, `npm-run-all`.

Browser/platform dependencies:

- Dropbox OAuth and Dropbox file APIs.
- WebAuthn via `navigator.credentials` for local device authentication.
- IndexedDB for offline cache and write queue.
- Service workers and Cache Storage for PWA behavior.
- Local development storage server at `http://localhost:8181`.

## Database and storage dependencies

There is no traditional server database. The primary durable data model is a set of JSON files stored in Dropbox or in the local `.tmp/` folder when using the development HTTP server.

Important JSON files include:

- `accounts.json`: account definitions.
- `config.json`: app configuration, stock API settings, and portfolio composition.
- `transactions_<year>_<month>.json`: monthly transaction data.
- `values_<year>.json`: monthly currency/asset values.
- `budget_<year>.json`: budget values and comments.
- `balance_<year>.json`: calculated balance snapshots.

Client-side IndexedDB is used as a cache and offline queue:

- Database: `balancer`.
- Object stores: `transactions` and `files`.
- Pending transaction changes are saved locally first, merged into monthly transaction files during sync, and then removed from the local transaction queue.
- Cached JSON files include metadata such as `date_cached` and `to_sync`; files marked `to_sync` are uploaded during sync.

Local/session storage is also used for provider selection and credentials:

- Dropbox access and refresh tokens.
- Dropbox OAuth code verifier.
- Local HTTP server bearer token.
- Selected storage provider.
- WebAuthn credential metadata for local device authentication.

## Current testing approach

Tests use Vitest through `npm run test`, with Vite configured for a Node test environment and `src/test/setup.ts` providing a minimal `window.location` mock.

The current suite is mostly unit-level and store/helper focused:

- Store specs cover balance calculation, config, storage state, accounts, values, transactions, and budget behavior.
- Helper specs cover options, file caching, IndexedDB wrappers, sync, browser helpers, storage provider selection, HTTP server storage client, PWA registration, group-data aggregation, and investment mapping.
- Tests rely heavily on `vi.mock`, fake `fetch`, fake `localStorage`, mocked Pinia setup, and mocked storage/file helpers.

There are no obvious end-to-end browser tests in the current project. UI behavior is covered indirectly through store/helper tests rather than rendered component flows.

Validation scripts defined in `package.json` are:

- `npm run test`: `vitest run`.
- `npm run type-check`: `vue-tsc --noEmit`.
- `npm run lint`: `eslint .`.
- `npm run build`: `vite build`.

## Known risks or unclear areas

- Dropbox is the production storage backend, but data consistency depends on client-side JSON file reads/writes and IndexedDB sync state. Conflict handling appears limited, especially when multiple devices modify the same monthly files.
- `syncCachedFiles()` in `Auth.vue` uses `forEach(async ...)`, so refresh operations are started without being awaited as a group. That can make completion timing unclear.
- Local device authentication uses WebAuthn as a local gate, but the durable app data is still protected mainly by storage-provider credentials and local storage/session storage tokens.
- Dropbox credentials, local HTTP tokens, and local WebAuthn metadata are stored in browser storage. This is common for a client-only app but has the usual browser-storage exposure risks.
- The local HTTP server uses a fixed development bearer token and writes to `.tmp/`; it should be treated as development-only.
- Google Drive appears in the storage provider type/options as a planned integration, but it is not implemented.
- Stock API settings are configurable in `config.json`, but no clear live stock-price fetch path was identified in the core files reviewed.
- Balance files are calculated snapshots saved back to storage. If transaction, value, or account data changes out of band, snapshots may need explicit recalculation to stay trustworthy.
- PWA behavior is configured, but service-worker source files include multiple variants and only generated build output determines the active runtime behavior.
- Most tests are unit tests with mocks. There is limited coverage of full user flows, real Dropbox integration, service-worker behavior, and rendered PrimeVue component interactions.

## Product Flow Coverage

- CONFIRMED: Covered flows include storage login/logout, local authentication, dashboard summaries, transaction CRUD, expense reporting, account management, budget editing, value editing/sync, balance reporting, investment analytics, general settings, local development storage, and PWA update prompts.
- CONFIRMED: Specs identify current automated coverage for stores/helpers and call out missing rendered component and integration tests.
- INFERRED: End-to-end user journeys are described across feature specs but not yet consolidated into a single happy-path onboarding-to-first-transaction scenario.
- UNCLEAR: First-run onboarding after a missing `accounts.json` seed is not specified as a user-facing product flow.
- UNCLEAR: Recovery flows for failed sync, lost WebAuthn credentials, missing exchange rates, and stale balances are not specified.
- CONFIRMED: Multi-device sync conflicts are specified as transaction merge-by-id and whole-file last writer wins with a visible warning.

## Highest-Risk Product Decisions

- CONFIRMED: Conflict resolution for concurrent edits is implemented for the current scope: transaction merge-by-id exists, and whole-file conflicts use last writer wins with a visible warning.
- UNCLEAR: Account deletion/reference policy affects transactions, budgets, values, balances, dashboard, expenses, and investments.
- UNCLEAR: Error UX for sync, provider login, WebAuthn, external value providers, and missing conversion rates is not specified consistently.
- UNCLEAR: Offline behavior needs a product-level promise separating offline app-shell availability from offline finance-data availability.
