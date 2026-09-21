# Milestone: milestone-gh-issues-1 — Azure Key Vault Connector

## Batch 1

- [x] task-1: Rename `packages/dummy/` to `packages/plugin-azure-keyvault/` (update package.json name/description/deps, remove dummy placeholder src files, add Azure deps)
- [x] task-2: Implement `AzureKeyVaultConnector` in `src/AzureKeyVaultConnector.ts` + update `src/index.ts` to export it
- [x] task-3: Write unit tests in `src/AzureKeyVaultConnector.test.ts` (load success, prefix, 404 error, JSON-parse, get-before-load, non-404 bubbles)
- [x] task-4: Scaffold `examples/with-azure-keyvault/` per example contract (package.json, tsconfig.json, kubricate.config.ts, setup-secrets.ts, stacks.ts, .env.example)
- [x] task-5: Verify build, tests, lint, and type-check pass across the workspace
