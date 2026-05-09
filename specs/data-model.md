# Data Model Spec

## Common Storage Rules
- CONFIRMED: JSON files are read and written by file name through `src/helpers/files.ts` and provider helpers under `src/helpers/storage/`.
- CONFIRMED: Cached file records in IndexedDB have at least `{ id, data, date_cached, to_sync }`.
- CONFIRMED: File names are significant: stores construct names directly and `Auth.vue` parses file-name prefixes to refresh store state.
- UNCLEAR: No formal runtime schema validation exists for JSON files.
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
- UNCLEAR: The product has not defined whether invalid JSON should be repaired, ignored, rejected with an error, or backed up before replacement.

## Versionless Compatibility Test Expectations
- CONFIRMED: Store/helper tests must keep coverage for current file names and top-level structures: `accounts.json`, `config.json`, `transactions_<year>_<month>.json`, `values_<year>.json`, `budget_<year>.json`, and `balance_<year>.json`.
- CONFIRMED: Tests for any newly added persisted structure must cover loading older files where that structure is absent and assert the documented default data.
- CONFIRMED: Tests for removed or deprecated persisted structures must cover files that still contain those structures and assert they are ignored.
- CONFIRMED: Tests must reject or flag changes that rename existing persisted files or replace their top-level structures.

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
- UNCLEAR: Missing `config.json` handling is weak; callers generally expect an object.
- UNCLEAR: No default `config.json` seed file or required minimum config shape is specified.

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
- UNCLEAR: What should happen when a stored JSON file is missing required fields or contains unknown enum values?
- UNCLEAR: Should derived `balance_<year>.json` be treated as disposable cache or user-visible durable history?
