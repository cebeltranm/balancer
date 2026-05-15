# Data Model Spec

## Common Storage Rules
- CONFIRMED: JSON files are read and written by file name through `src/helpers/files.ts` and provider helpers under `src/helpers/storage/`.
- CONFIRMED: Cached file records in IndexedDB have at least `{ id, data, date_cached, to_sync }`.
- CONFIRMED: File names are significant: stores construct names directly and `Auth.vue` parses file-name prefixes to refresh store state.
- REQUIRED: Persisted JSON reads must distinguish missing files from invalid files. Invalid files include unparseable JSON, files missing required fields, and files containing values that cannot be accepted by the current compatibility rules.
- REQUIRED: Invalid persisted files must not be overwritten automatically. The app must show a recoverable error and keep the raw remote file intact until the user explicitly chooses a recovery action.
- CONFIRMED: Current code represents invalid persisted-file failures with recoverable `PersistedFileError` metadata, rejects unparseable provider JSON, blocks automatic writes after invalid remote reads, and validates malformed `accounts.json` entries before replacing account store state.
- CONFIRMED: Persisted JSON files use a versionless compatibility policy. Existing file names and top-level structures are compatibility contracts and must not be renamed, wrapped, or replaced.
- CONFIRMED: New persisted structures must be additive and must have default data when omitted from older files.
- CONFIRMED: Removed or deprecated persisted structures must be ignored when present in older files.
- CONFIRMED: Current code satisfies this policy at the store/helper level through `src/helpers/persistedShapes.ts`, `src/helpers/__tests__/persistedShapes.spec.ts`, and persisted-family store tests under `src/stores/__tests__/`.

## Data Model Acceptance Criteria
- CONFIRMED: GIVEN any persisted domain file is read, WHEN the file exists and contains valid JSON in the expected shape, THEN the owning store can load it without mutating unrelated files.
- CONFIRMED: GIVEN a domain file is staged in IndexedDB for upload, WHEN sync counters are recalculated, THEN its cached record has `to_sync: true` until upload succeeds.
- CONFIRMED: GIVEN a domain file is read remotely through `readJsonFile()`, WHEN caching is enabled, THEN IndexedDB stores the file with `to_sync: false`.
- CONFIRMED: GIVEN an existing persisted JSON file name or top-level structure, WHEN future changes are designed, THEN the existing name and structure must remain accepted and must not be renamed, wrapped, or replaced.
- CONFIRMED: GIVEN an older file omits a newly added persisted structure, WHEN the owning store reads it, THEN the store must apply a documented default value and continue loading the file.
- CONFIRMED: GIVEN an older file still contains a removed or deprecated structure, WHEN the owning store reads it, THEN the store must ignore that structure without failing the load.
- REQUIRED: GIVEN a persisted JSON file exists remotely but cannot be parsed as JSON, WHEN the app attempts to load that file, THEN the app must report a recoverable invalid-file error, must not cache the file as valid domain data, and must not write a replacement file automatically.
- REQUIRED: GIVEN a persisted JSON file parses but is missing fields required by its file family, WHEN the owning store validates the file, THEN the app must report a recoverable malformed-file error and keep the raw remote file intact until user action.
- REQUIRED: GIVEN a persisted JSON file contains an enum value that is not accepted by the current data model or a documented compatibility migration, WHEN the owning store validates the file, THEN the app must report a recoverable malformed-file error and must not silently load the value into grouping, reporting, or write paths.
- REQUIRED: GIVEN cached valid data exists locally and the remote file is invalid, WHEN the app detects the invalid remote file, THEN the app may continue displaying clearly stale cached data only if the invalid-file error remains visible and no automatic write attempts to replace the invalid remote file.
- REQUIRED: GIVEN the user has not selected a recovery action, WHEN startup, sync refresh, derived value bootstrapping, balance recalculation, or first-run seeding would write the same file family, THEN that write must be blocked for the invalid file.

## Versionless Compatibility Test Expectations
- CONFIRMED: Store/helper tests must keep coverage for current file names and top-level structures: `accounts.json`, `config.json`, `transactions_<year>_<month>.json`, `values_<year>.json`, `budget_<year>.json`, and `balance_<year>.json`.
- CONFIRMED: Tests for any newly added persisted structure must cover loading older files where that structure is absent and assert the documented default data.
- CONFIRMED: Tests for removed or deprecated persisted structures must cover files that still contain those structures and assert they are ignored.
- CONFIRMED: Tests must reject or flag changes that rename existing persisted files or replace their top-level structures.
- REQUIRED: Provider/helper tests must cover unparseable remote JSON and assert that invalid content is surfaced as an invalid-file condition instead of a missing file.
- REQUIRED: Store tests for each persisted file family must cover required-field and invalid-enum failures where applicable, and assert that invalid data is not accepted into normal store state.
- REQUIRED: Startup/bootstrap tests must cover invalid `accounts.json`, `config.json`, values, budget, balance, and transaction files and assert that no automatic seed, default, derived, or sync write overwrites the invalid remote file.
- REQUIRED: UI or storage-state tests must assert that invalid-file failures produce a recoverable user-visible error with enough file context for the user to choose a recovery action.
- CONFIRMED: Current tests cover HTTP provider invalid JSON, helper-level invalid-read write blocking, and account required-field/unsupported-type rejection.

## `accounts.json`
- CONFIRMED: File name pattern is exactly `accounts.json`.
- CONFIRMED: Purpose is account definition, account grouping, account selector input, expense category trees, investment metadata, dashboard categories, and relationships used by other JSON files.
- CONFIRMED: Shape is a record keyed by account id. Each value is an account payload without `id` when persisted by `saveAccount()`.
- CONFIRMED: Supported fields from code are `name`, `type`, `currency`, `category`, `entity`, `activeFrom`, `hideSince`, `symbol`, `logo`, `risk`, and `class`.
- CONFIRMED: `activeFrom` and `hideSince` are serialized as `YYYY-MM-DD` strings and parsed into `Date` objects on load.
- CONFIRMED: `category` is an array of strings when present; empty categories are omitted on save.
- CONFIRMED: `class` is a nested record `{ [assetClass]: { [region]: number } }` for account allocation weights.
- CONFIRMED: A top-level `default` entry is ignored during load.
- CONFIRMED: Account ids are referenced by transactions, values, budget, and balance files.
- CONFIRMED: Account UI validates new ids as required, unique, and matching `/^[a-z0-9_]+$/i`; name, type, currency, and active-from are required; expense accounts require at least one category; investment accounts require entity, risk from 1 to 5, and class allocation totaling 100%.
- REQUIRED: Archive/hide is the only supported normal account-removal path. Hiding sets `hideSince` and preserves the account id and payload in `accounts.json`.
- REQUIRED: Hard deletion of account keys is blocked in all cases from normal app code, regardless of whether references are currently known.
- CONFIRMED: Current code blocks store-level hard deletion and does not expose a hard-delete action in account management.
- INFERRED: Existing invalid account type strings may load but fail grouping because `ACCOUNT_GROUP_TYPES` uses enum values.
- UNCLEAR: No authoritative migration rule exists for legacy account type strings.

## `config.json`
- CONFIRMED: File name pattern is exactly `config.json`.
- CONFIRMED: Purpose is app configuration for stock API settings and target investment composition.
- CONFIRMED: Shape is an object with visible fields `stock_api` and `inv_composition`.
- CONFIRMED: `stock_api` includes `type`, `host`, and `key`; type values are `rapidapi`, `marketstack`, or `alphavantage`.
- CONFIRMED: `inv_composition` shape is `{ [assetClass]: { [region]: { [instrumentType]: number } } }`.
- CONFIRMED: Settings UI edits composition as percentages and saves normalized decimal values by dividing by 100.
- CONFIRMED: Settings UI rejects negative/non-numeric weights and total allocation not equal to 100%.
- CONFIRMED: Config composition is transformed by `useConfigStore()` into grouped composition by asset class and by region for portfolio views.
- REQUIRED: The minimum persisted `config.json` shape is `{ "stock_api": {}, "inv_composition": {} }`.
- REQUIRED: On first successful storage initialization, when `config.json` is missing, the app must create `config.json` with the minimum persisted shape.
- REQUIRED: Existing valid `config.json` files must not be overwritten during first-run seeding, including files that omit one or both additive config structures.
- REQUIRED: If remote `config.json` exists but is invalid or malformed, first-run seeding must not replace it automatically; invalid-file recovery rules apply.
- CONFIRMED: Current code satisfies this requirement: config loading normalizes missing additive structures to empty `stock_api` and `inv_composition` in memory, and first successful storage initialization creates a missing `config.json` with the minimum persisted shape without overwriting existing or invalid config files.

## `config.json` Acceptance Criteria
- REQUIRED: GIVEN storage initialization succeeds and `config.json` is missing, WHEN the app performs first-run storage checks, THEN it writes `config.json` as `{ "stock_api": {}, "inv_composition": {} }`.
- REQUIRED: GIVEN storage initialization succeeds and `config.json` already exists as valid JSON, WHEN the app performs first-run storage checks, THEN it does not overwrite the existing remote config file.
- REQUIRED: GIVEN an older valid `config.json` omits `stock_api` or `inv_composition`, WHEN the config store loads it, THEN the store exposes those omitted structures as empty objects without rewriting the remote file solely for normalization.
- REQUIRED: GIVEN `config.json` exists remotely but is invalid JSON or malformed, WHEN first-run storage checks or config loading run, THEN the app reports the recoverable invalid-file condition and does not write the minimum config over the remote file.

## `config.json` Test Expectations
- REQUIRED: Store/helper tests must keep asserting that omitted `stock_api` and `inv_composition` are normalized to empty objects on load.
- REQUIRED: Startup/bootstrap tests must assert that missing `config.json` is seeded with `{ "stock_api": {}, "inv_composition": {} }` after successful storage initialization.
- REQUIRED: Startup/bootstrap tests must assert that an existing valid `config.json` is not overwritten by the default seed.
- REQUIRED: Startup/bootstrap or file-helper tests must assert that invalid or malformed remote `config.json` blocks automatic default seeding and preserves the remote file for recovery.

## `transactions_<year>_<month>.json`
- CONFIRMED: File name pattern is `transactions_<year>_<month>.json`, where month is a 1-based number without visible zero-padding.
- CONFIRMED: Purpose is monthly transaction storage.
- CONFIRMED: Shape is an array of transactions.
- CONFIRMED: Transaction fields include `id`, `date`, `description`, optional `tags`, `values`, optional `deleted`, and local-only optional `to_sync`.
- CONFIRMED: Each transaction value includes `accountId`, `value`, optional `accountValue`, and optional `units`.
- CONFIRMED: Transaction editor requires non-future date, description length at least 5, values with accounts and numeric values, expense values greater than 0, unit values for unit-based accounts, and total value sum approximately 0.
- CONFIRMED: For same-currency values, `accountValue` is persisted equal to `value`; for cross-currency values, `accountValue` is separately entered or rate-derived.
- CONFIRMED: Pending local transactions override same-id remote transactions during load; pending deleted transactions are excluded from the visible merged list.
- CONFIRMED: Sync merges pending transactions into the month file by removing same ids from the remote file and appending non-deleted pending transactions.
- INFERRED: `deleted` is a queue marker for sync, not intended to remain in durable monthly files after successful sync.
- INFERRED: Id generation with `Date.now()` is collision-prone only in extreme same-millisecond cases.
- UNCLEAR: No global uniqueness or audit-history requirement is specified for transaction ids.

## `values_<year>.json`
- CONFIRMED: File name pattern is `values_<year>.json`.
- CONFIRMED: Purpose is yearly monthly exchange rates and asset prices.
- CONFIRMED: Shape is `{ [monthNumber]: { [assetIdOrCurrency]: { [currency]: number } } }`.
- CONFIRMED: Currency values are stored as `usd -> targetCurrency` rates, for example `{ usd: { cop: 4000 } }`.
- CONFIRMED: Investment/property values are stored as `{ [accountId]: { [accountCurrency]: value } }`.
- CONFIRMED: `getValue()` returns 1 for same asset/currency, direct rates, inverse rates, fallback to prior months up to `maxLevels`, and USD cross-rates when neither side is USD.
- CONFIRMED: Explicit zero values are respected and do not fall back.
- CONFIRMED: `ensureCurrentMonthValues(true)` copies previous month values into a missing current month and stages the file for sync.
- CONFIRMED: Values UI only accepts edited values when the new value is non-negative and different.
- INFERRED: Values are account-id dependent for assets, so account id changes orphan value history.

## `budget_<year>.json`
- CONFIRMED: File name pattern is `budget_<year>.json`.
- CONFIRMED: Purpose is yearly budget values and budget comments by expense account.
- CONFIRMED: Shape is `{ values: { [accountId]: { [monthNumber]: number } }, comments: { [accountId]: { [monthNumber]: string[] } } }`.
- CONFIRMED: Missing `values` or `comments` are treated as empty objects.
- CONFIRMED: Budget grouping sums values across month/quarter/year periods and concatenates comments.
- CONFIRMED: Budget UI edits month cells, can apply a month value to subsequent months, remove a month value, and add/remove comment arrays.
- CONFIRMED: Budget edits are staged to IndexedDB as `to_sync: true` and pending sync counters are updated.
- INFERRED: Budget data references expense account ids; deleting accounts leaves stale budget keys.

## `balance_<year>.json`
- CONFIRMED: File name pattern is `balance_<year>.json`.
- CONFIRMED: Purpose is calculated yearly balance snapshots by account and month.
- CONFIRMED: Shape is `{ [accountId]: { [monthNumber]: BalanceEntry } }`.
- CONFIRMED: `BalanceEntry` has `value`, `expenses`, `in`, `out`, `in_local`, `out_local`, and `units`.
- CONFIRMED: Expense account monthly value is the transaction `accountValue` sum; income monthly value is the negative of transaction `accountValue` sum.
- CONFIRMED: Cash, credit card, loan, bank account, receivable, and payable values carry previous month value plus current transaction change.
- CONFIRMED: Investment/fixed asset/property/mutual fund-like balances use values file prices and transaction-derived flow fields.
- CONFIRMED: ETF, stock, and crypto balances carry units from previous month plus transaction units and value them by current asset value.
- CONFIRMED: Recalculation recursively updates future months until current month and stages the year file for sync only for December or the current month.
- INFERRED: Balance is derived and can be regenerated, but it is persisted for performance and reporting.

## Cross-File Reference Rules
- CONFIRMED: Transactions, budget, values, and balance files reference account ids from `accounts.json`.
- CONFIRMED: Values and balance calculations depend on currency codes and account types being stable across files.
- INFERRED: Account ids act as durable foreign keys even though no schema or referential-integrity check enforces that relationship.
- REQUIRED: Account ids are durable historical references. Account lifecycle must preserve ids by hiding/archiving accounts instead of deleting them.
- REQUIRED: Hard deletion must not cascade, orphan, or remove referenced account ids from `accounts.json` in normal app flows.
- REQUIRED: Tests for account lifecycle must verify that hiding preserves lookup data for transactions, budgets, values, and balances that reference the account id.

## Product Questions
- CONFIRMED: The app must not introduce schema versions for the current persisted JSON files; compatibility is maintained by preserving names and top-level structures, adding defaulted structures only, and ignoring removed structures.
- RESOLVED: Invalid persisted files, including unparseable JSON, missing required fields, and unsupported enum values, must not be overwritten automatically. The app must show a recoverable error and keep the raw remote file intact until user action.
- CONFIRMED: RT-005 is implemented for the current persisted-file read/write path and `accounts.json` malformed-entry validation. Broader recovery UI polish remains part of future error-handling work.
- UNCLEAR: Should derived `balance_<year>.json` be treated as disposable cache or user-visible durable history?
