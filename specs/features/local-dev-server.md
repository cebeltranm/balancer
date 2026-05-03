# Feature: Local Dev Server

## Goal
- CONFIRMED: Provide a local JSON storage backend for development without Dropbox.

## Current Implemented Behavior
- CONFIRMED: `server/index.js` starts an Express server on port `8181`.
- CONFIRMED: The server uses CORS and JSON body parsing.
- CONFIRMED: `GET /_ping` returns 200.
- CONFIRMED: `POST /auth/login` returns fixed token `balancer-local-dev-token`.
- CONFIRMED: `GET /auth/session`, `GET /list`, static file reads, and JSON writes require `Authorization: Bearer balancer-local-dev-token`.
- CONFIRMED: JSON writes matching `/*.json` write request body to `.tmp/<path>`.
- CONFIRMED: Static serving reads files from `.tmp/`.
- CONFIRMED: Client helper `HttpServerStore` targets `http://localhost:8181/`.
- CONFIRMED: Local HTTP provider is only exposed when app host is `localhost:3000`.

## User Flows
- CONFIRMED: Run the local server separately.
- CONFIRMED: Open Vite dev app on `localhost:3000`.
- CONFIRMED: Select or default to Local HTTP server provider.
- CONFIRMED: Log in and read/write JSON files from `.tmp/`.

## Inputs And Outputs
- CONFIRMED: Inputs are HTTP requests, bearer token, and JSON request bodies.
- CONFIRMED: Outputs are JSON files under `.tmp/`, file listing metadata, and auth/session responses.

## Data Files Read/Written
- CONFIRMED: Reads/writes all `*.json` app data files under `.tmp/`.
- CONFIRMED: Does not use Dropbox or IndexedDB itself; IndexedDB remains browser-side.

## Store / Helper / Component Files Involved
- CONFIRMED: `server/index.js`, `src/helpers/storage/http_server.ts`, `src/helpers/storage/index.ts`, `src/stores/storage.ts`, `src/components/Auth.vue`.

## Error Handling
- CONFIRMED: Unauthorized protected routes return 401 JSON.
- CONFIRMED: `/list` returns 500 JSON on filesystem errors.
- CONFIRMED: JSON write returns 500 on filesystem write error.
- CONFIRMED: Client removes token on 401.

## Edge Cases
- CONFIRMED: Server does not create `.tmp/`; missing directory can make `/list` fail.
- CONFIRMED: The auth token is fixed and development-only.
- CONFIRMED: `getLastModification()` in client helper returns current date rather than real server metadata for a specific file.

## Acceptance Criteria
- CONFIRMED: GIVEN the app host is `localhost:3000`, WHEN storage providers are listed, THEN the Local HTTP server provider is available.
- CONFIRMED: GIVEN the app host is not `localhost:3000`, WHEN storage providers are listed, THEN the Local HTTP server provider is not available.
- CONFIRMED: GIVEN the client has logged in to the local server, WHEN it reads, writes, or lists files, THEN requests include `Authorization: Bearer balancer-local-dev-token`.
- CONFIRMED: GIVEN an authorized JSON write request targets `/*.json`, WHEN the server handles it, THEN the request body is written under `.tmp/`.
- UNCLEAR: Path traversal behavior for nested or malicious JSON paths is not specified.

## Existing Tests Related To This Feature
- CONFIRMED: `src/helpers/__tests__/httpServer.spec.ts` covers ping/session info, token storage, authenticated reads/writes, 401 token removal, and logout.
- CONFIRMED: `src/helpers/__tests__/storageIndex.spec.ts` covers local provider availability on localhost.

## Missing Tests / Coverage Gaps
- CONFIRMED: No tests run the actual Express server.
- CONFIRMED: No tests for `/list` filesystem failures or write failures.
- CONFIRMED: No test verifies `.tmp` path traversal protections.

## Product Questions
- UNCLEAR: Should the local server create `.tmp/` automatically when missing?
- UNCLEAR: Should the local server reject nested paths or normalize them to a safe file name?
