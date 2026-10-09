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
- CONFIRMED: Current code does not create `.tmp/`; a missing directory makes `GET /list` return 500 and JSON writes return 500 (ENOENT). `.tmp` is git-ignored, so a fresh clone hits this by default.
- DECIDED (RT-027): The server creates `.tmp/` automatically (see Acceptance Criteria). This is development-only behavior.
- CONFIRMED: The auth token is fixed and development-only.
- CONFIRMED: `getLastModification()` in client helper returns current date rather than real server metadata for a specific file.

## Acceptance Criteria
- CONFIRMED: GIVEN the app host is `localhost:3000`, WHEN storage providers are listed, THEN the Local HTTP server provider is available.
- CONFIRMED: GIVEN the app host is not `localhost:3000`, WHEN storage providers are listed, THEN the Local HTTP server provider is not available.
- CONFIRMED: GIVEN the client has logged in to the local server, WHEN it reads, writes, or lists files, THEN requests include `Authorization: Bearer balancer-local-dev-token`.
- CONFIRMED: GIVEN an authorized JSON write request targets `/*.json`, WHEN the server handles it, THEN the request body is written under `.tmp/`.
- UNCLEAR: Path traversal behavior for nested or malicious JSON paths is not specified (tracked as RT-028).

### RT-027: `.tmp/` auto-creation (development-only)
Implementation status: NOT SATISFIED by current code (`server/index.js` has no `mkdir`/`existsSync`; no tests cover it).
- DECIDED: GIVEN `.tmp/` does not exist, WHEN the server starts, THEN it creates `.tmp/` (recursively) before listening, without error.
- DECIDED: GIVEN `.tmp/` does not exist (e.g. deleted while the server runs), WHEN an authorized `GET /list` is received, THEN the server creates `.tmp/` and responds 200 with `[]`.
- DECIDED: GIVEN `.tmp/` does not exist, WHEN an authorized `POST /<name>.json` is received, THEN the server creates `.tmp/`, writes the file, and responds 200.
- DECIDED: GIVEN `.tmp/` already exists, WHEN the server starts or handles any request, THEN existing files are left untouched and no error occurs.
- DECIDED: GIVEN `.tmp/` cannot be created (e.g. permissions), WHEN `/list` or a write is handled, THEN the existing 500 JSON error behavior applies.
- DECIDED: Unauthorized requests still return 401; auto-creation does not bypass auth.
- DECIDED: This behavior is development-only and must be documented as such in the README. It does not change production/Dropbox storage behavior.

## Existing Tests Related To This Feature
- CONFIRMED: `src/helpers/__tests__/httpServer.spec.ts` covers ping/session info, token storage, authenticated reads/writes, 401 token removal, and logout.
- CONFIRMED: `src/helpers/__tests__/storageIndex.spec.ts` covers local provider availability on localhost.

## Missing Tests / Coverage Gaps
- CONFIRMED: No tests run the actual Express server.
- CONFIRMED: No tests for `/list` filesystem failures or write failures.
- CONFIRMED: No test verifies `.tmp` path traversal protections.
- CONFIRMED: No test verifies `.tmp/` auto-creation (RT-027).

## Test Expectations (RT-027)
- EXPECTED: Server-level tests (the server must be importable without auto-listening, or `.tmp` creation extracted into a testable helper such as `ensureTmpDir(dir)`), using a temporary directory rather than the real `.tmp/`:
  - Helper/startup creates a missing directory, including nested parents.
  - Helper/startup is a no-op when the directory exists and preserves existing files.
  - `GET /list` with missing `.tmp/` and valid bearer token returns 200 and `[]`.
  - `POST /<name>.json` with missing `.tmp/` returns 200 and the file exists with the serialized body.
  - Requests without a valid token return 401 and do not create `.tmp/`.
  - A creation failure surfaces as the existing 500 JSON response.
- EXPECTED: Existing client tests (`httpServer.spec.ts`, `storageIndex.spec.ts`) need no changes.
- EXPECTED: README documents that the local server auto-creates `.tmp/` and is development-only.

## Product Questions
- DECIDED (RT-027): The local server creates `.tmp/` automatically when missing, on startup and before list/write operations; development-only.
- UNCLEAR: Should the local server reject nested paths or normalize them to a safe file name?
