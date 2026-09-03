# Autopilot Run Batch 1

## Mode
auto

## Summary
Implemented `@kubricate/plugin-azure-keyvault` from scratch by repurposing the `packages/dummy/` placeholder package. Delivered the connector class, unit tests, and a working example app. All checks pass.

## Tasks Completed
- task-1: Renamed `packages/dummy/` → `packages/plugin-azure-keyvault/`, updated `package.json` with Azure deps and correct metadata
- task-2: Implemented `AzureKeyVaultConnector` — `BaseConnector<AzureKeyVaultConnectorConfig>` with lazy `SecretClient`, prefix support, JSON flat-object parsing, clean 404 error messages
- task-3: 6 unit tests covering: load success, prefix, 404 error, JSON-parse, get-before-load, non-404 bubbles — all passing
- task-4: Scaffolded `examples/with-azure-keyvault/` with `setup-secrets.ts`, `stacks.ts`, `kubricate.config.ts`, `.env.example` — type-check passes
- task-5: Build, test, lint, check-types all pass for both the plugin and the example

## Decisions Made (auto mode)
- **Issue:** `kubernetes-models` not listed as a direct dep in the example's `package.json`
- **Options:** (a) add as direct dep, (b) suppress TS error
- **Chosen:** Added `kubernetes-models` as a direct dependency
- **Reason:** Same fix used by `examples/with-secret-manager/`; suppressing TS errors is worse practice

## Backlog
None — all milestone goals met.

## User Action Needed
None. The package is ready for review and publishing via changesets when desired.
