# Balancer

Balancer is an application for tracking expenses and investments. The application runs in the browser and stores the data in json files in dropbox

## Tech Stack

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- PrimeVue / PrimeFlex
- Chart.js
- Vitest
- ESLint

## Requirements

- Node.js
- npm 

## Getting Started

Install dependencies:

```sh
npm install
```

Starts the local server to return files
```sh
node server/index.js
```
The local server is for development only. It stores JSON files in the git-ignored `.tmp/` folder and creates that folder automatically if it is missing.

Run the development server:

```sh
npm run dev
```

## First Run

On first use, complete these steps in order:

1. **Storage login**: choose a storage provider in the authentication dialog and log in.
2. **Seed accounts**: if storage has no `accounts.json`, the app creates it from `public/accounts.json`. An existing `accounts.json` is never overwritten.
3. **Register local credential**: register a device credential (WebAuthn). It is required and cannot be skipped; it only gates the app on this device.
4. **Review/edit accounts**: open Accounts and adjust the seeded accounts (names, types, currencies, hide/unhide). The seed is a starting template.
5. **Confirm base currency/config**: check each account's currency and review `config.json` in Settings (`stock_api`, `inv_composition`). There is no separate base-currency setting.

## Scripts

- `npm run dev`: start local dev server
- `npm run build`: production build
- `npm run test`: run Vitest
- `npm run type-check`: run `vue-tsc --noEmit`
- `npm run lint`: run ESLint
- `npm run release`: version bump + build with `/balancer/` base + deploy via `gh-pages`
