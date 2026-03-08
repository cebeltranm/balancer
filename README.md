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

Run the development server:

```sh
npm run dev
```

## Scripts

- `npm run dev`: start local dev server
- `npm run build`: production build
- `npm run test`: run Vitest
- `npm run type-check`: run `vue-tsc --noEmit`
- `npm run lint`: run ESLint
- `npm run release`: version bump + build with `/balancer/` base + deploy via `gh-pages`
