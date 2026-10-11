# Feature: Local Dev Server

## Goal
- CONFIRMED: Provide a local JSON storage backend for development without Dropbox.

## Observed Implementation
- CONFIRMED: `server/index.js` starts an Express server on port `8181`.
- CONFIRMED: The server uses CORS and JSON body parsing.
- CONFIRMED: `GET /_ping` returns 200.
- CONFIRMED: `POST /auth/login` returns fixed token `balancer-local-dev-token`.
- CONFIRMED: `GET /auth/session`, `GET /list`, static file reads, and JSON writes require `Authorization: Bearer balancer-local-dev-token`.
- CONFIRMED: JSON writes matching `/*.json` write request body to `.tmp/<path>`.
- CONFIRMED: Static serving reads files from `.tmp/`.
- CONFIRMED: Client helper `HttpServerStore` targets `http://localhost:8181/`.
- CONFIRMED: Local HTTP provider is only exposed when app host is `localhost:3000`.
- CONFIRMED: Contract status: satisfied for RT-027 (see the RT-027 notes); RT-028 is decided but NOT yet satisfied by current code (see the RT-028 notes).

## Product Contract
- REQUIRED (RT-027): The local dev server creates `.tmp/` automatically when missing, and is development-only.
- REQUIRED (RT-028): JSON writes must only ever produce a flat, safe `.json` file directly under `.tmp/`. Path traversal, nested paths, and unsafe file names are rejected (not rewritten); nothing is written outside `.tmp/`.

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
- CONFIRMED: `server/index.js` creates `.tmp/` (recursively) on startup and before `GET /list` and JSON writes (`ensureTmpDir()`). `.tmp` is git-ignored, so a fresh clone relies on this. Development-only behavior; documented in README.
- CONFIRMED (RT-027): Previously a missing `.tmp/` made `/list` and JSON writes return 500 (ENOENT); this is resolved.
- CONFIRMED: The auth token is fixed and development-only.
- CONFIRMED: `getLastModification()` in client helper returns current date rather than real server metadata for a specific file.

## Acceptance Criteria
- CONFIRMED: GIVEN the app host is `localhost:3000`, WHEN storage providers are listed, THEN the Local HTTP server provider is available.
- CONFIRMED: GIVEN the app host is not `localhost:3000`, WHEN storage providers are listed, THEN the Local HTTP server provider is not available.
- CONFIRMED: GIVEN the client has logged in to the local server, WHEN it reads, writes, or lists files, THEN requests include `Authorization: Bearer balancer-local-dev-token`.
- CONFIRMED: GIVEN an authorized JSON write request targets `/*.json`, WHEN the server handles it, THEN the request body is written under `.tmp/`.
- REQUIRED (RT-028): See "RT-028: JSON write path safety" below. Current code does not satisfy it.

### RT-027: `.tmp/` auto-creation (development-only)
Implementation status: SATISFIED by current code (`ensureTmpDir()` in `server/index.js`), covered by `src/helpers/__tests__/localDevServer.spec.ts`. Exception: a startup-time creation failure (e.g. permissions) throws and stops the server rather than returning a 500; the 500 behavior applies only to `/list` and writes.
- CONFIRMED: GIVEN `.tmp/` does not exist, WHEN the server starts, THEN it creates `.tmp/` (recursively) before listening, without error.
- CONFIRMED: GIVEN `.tmp/` does not exist (e.g. deleted while the server runs), WHEN an authorized `GET /list` is received, THEN the server creates `.tmp/` and responds 200 with `[]`.
- CONFIRMED: GIVEN `.tmp/` does not exist, WHEN an authorized `POST /<name>.json` is received, THEN the server creates `.tmp/`, writes the file, and responds 200.
- CONFIRMED: GIVEN `.tmp/` already exists, WHEN the server starts or handles any request, THEN existing files are left untouched and no error occurs.
- CONFIRMED: GIVEN `.tmp/` cannot be created (e.g. permissions), WHEN `/list` or a write is handled, THEN the existing 500 JSON error behavior applies.
- CONFIRMED: Unauthorized requests still return 401; auto-creation does not bypass auth.
- CONFIRMED: This behavior is development-only and is documented as such in the README. It does not change production/Dropbox storage behavior.

### RT-028: JSON write path safety
Implementation status: NOT SATISFIED by current code. `app.post(/\/.*\.json$/, …)` in `server/index.js` writes to `TMP_DIR + req.path` with no decoding, validation, or containment check. Current client usage (`HttpServerStore.writeJsonFile`) only sends flat names such as `config.json`, so valid traffic is unaffected.

Decision: reject path traversal and nested paths with a 400 JSON error, and only accept safe flat `.json` file names under `.tmp/`. Rejection is explicit; the server never silently renames or rewrites a name.

Safe file name rule (applied to the percent-decoded request path, after removing the single leading `/`):
- Matches `^[A-Za-z0-9._-]+\.json$`.
- Contains no `/`, `\`, NUL byte, or `..` sequence anywhere in the name.
- The resolved target (`path.resolve(TMP_DIR, name)`) has `TMP_DIR` as its parent directory (defence in depth).
- A malformed percent-encoding is rejected with 400.

Acceptance criteria:
- REQUIRED: GIVEN an authorized `POST /<name>.json` with a safe flat name, WHEN handled, THEN the serialized body is written to `.tmp/<name>.json` and the response is 200 (unchanged behavior, e.g. `config.json`, `values_2025.json`).
- REQUIRED: GIVEN an authorized write whose path contains `..` (raw or percent-encoded, e.g. `/..%2f..%2fescape.json`), WHEN handled, THEN the response is 400 JSON `{ "error": … }` and no file is created outside `.tmp/`.
- REQUIRED: GIVEN an authorized write to a nested path (`/sub/x.json`, `/sub%2fx.json`) or one containing a backslash, WHEN handled, THEN the response is 400, and no file or subdirectory is created in `.tmp/`.
- REQUIRED: GIVEN an authorized write with a malformed percent-encoding or a NUL byte in the name, WHEN handled, THEN the response is 400 and nothing is written.
- REQUIRED: GIVEN an unauthorized write with an unsafe path, WHEN handled, THEN the response is 401 (auth runs before validation) and nothing is written.
- REQUIRED: Rejected requests do not alter existing `.tmp/` files.
- CONFIRMED: Non-`.json` write paths are already not routed to the write handler (they fall through to the static handler), and static reads rely on `express.static` containment. Neither changes.
- CONFIRMED: Development-only; no change to Dropbox or any production storage behavior.

## Existing Tests Related To This Feature
- CONFIRMED: `src/helpers/__tests__/httpServer.spec.ts` covers ping/session info, token storage, authenticated reads/writes, 401 token removal, and logout.
- CONFIRMED: `src/helpers/__tests__/storageIndex.spec.ts` covers local provider availability on localhost.
- CONFIRMED: `src/helpers/__tests__/localDevServer.spec.ts` runs the real server as a child process (RT-027).

## Missing Tests / Coverage Gaps
- CONFIRMED: Required component, integration, and manual coverage levels for this feature are defined in `specs/testing-strategy.md` (RT-031); keep both in sync when closing a gap.
- CONFIRMED: `src/helpers/__tests__/localDevServer.spec.ts` runs a copy of `server/index.js` as a child process and covers `.tmp/` creation, `/list`, JSON writes, and unauthorized requests (RT-027).
- CONFIRMED: No tests for `/list` filesystem failures or write failures.
- CONFIRMED: No test verifies `.tmp` path traversal protections yet. The expected behavior is now decided (RT-028, see Test Expectations (RT-028)); the tests are required but not yet written.
- CONFIRMED: `.tmp/` auto-creation is covered by `localDevServer.spec.ts` (runs a copy of `server/index.js` as a child process); the creation-failure-returns-500 criterion is not tested.

## Test Expectations (RT-027)
- IMPLEMENTED (except the creation-failure case): Server-level tests (the server must be importable without auto-listening, or `.tmp` creation extracted into a testable helper such as `ensureTmpDir(dir)`), using a temporary directory rather than the real `.tmp/`:
  - Helper/startup creates a missing directory, including nested parents.
  - Helper/startup is a no-op when the directory exists and preserves existing files.
  - `GET /list` with missing `.tmp/` and valid bearer token returns 200 and `[]`.
  - `POST /<name>.json` with missing `.tmp/` returns 200 and the file exists with the serialized body.
  - Requests without a valid token return 401 and do not create `.tmp/`.
  - A creation failure surfaces as the existing 500 JSON response.
- CONFIRMED: Existing client tests (`httpServer.spec.ts`, `storageIndex.spec.ts`) need no changes.
- CONFIRMED: README documents that the local server auto-creates `.tmp/` and is development-only.

## Test Expectations (RT-028)
- REQUIRED (not yet implemented): Extend `src/helpers/__tests__/localDevServer.spec.ts` (same child-process harness, temporary project root) with a RT-028 `describe`. Use `node:http` with a raw request path for traversal cases, because `fetch` normalizes `..` segments before sending:
  - `POST /..%2f..%2fescape.json` returns 400 and no `escape.json` exists in the temporary root or its parent.
  - Raw `POST /../escape.json` is rejected (400, or the framework's equivalent 4xx) and nothing is written outside `.tmp/`.
  - `POST /sub/x.json` and `POST /sub%2fx.json` return 400 and `.tmp/` contains no `sub/` or `x.json`.
  - A backslash name (`..%5Cx.json`) and a malformed encoding (`/%E0%A4%A.json`) return 400.
  - A valid `POST /data.json` still returns 200 and writes the body (also covered by the RT-027 test).
  - An unauthorized traversal attempt returns 401 and writes nothing.
  - An existing `.tmp/` file is unchanged after a rejected request.
- CONFIRMED: Existing client tests (`httpServer.spec.ts`, `storageIndex.spec.ts`) need no changes, because the client only sends flat names.
- CONFIRMED: README should note that the dev server only accepts flat `.json` names; update it when the code change lands.

## Product Questions
- RESOLVED/IMPLEMENTED (RT-027): The local server creates `.tmp/` automatically when missing, on startup and before list/write operations; development-only.
- RESOLVED (RT-028, code change pending): The local server rejects path traversal and nested paths with 400 and accepts only safe flat `.json` file names under `.tmp/`; it does not silently rewrite names.
