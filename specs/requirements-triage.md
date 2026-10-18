# Requirements Triage

Open product decisions only. RT-001 to RT-044 are closed and recorded in the specs.

| ID | Question | Status |
| --- | --- | --- |
| RT-045 | When the seed write of `config.json` (`ensureMinimumConfigFile` in `src/stores/storage.ts`) or `accounts.json` (`checkStore` in `src/components/Auth.vue`) returns `false`, should the user see an `error` toast, or is it console-only (an override of `validation-and-errors.md` "No failure may be silent")? | UNCLEAR. Code today ignores the result. No code change until decided. |
