# Milestone Goal: Azure Key Vault Connector

## Objective

Implement `@kubricate/plugin-azure-keyvault` — a Kubricate plugin package containing `AzureKeyVaultConnector`, which reads secrets from Azure Key Vault and integrates with Kubricate's `SecretManager`.

## Scope

**In scope:**
- `AzureKeyVaultConnector` class implementing `BaseConnector<AzureKeyVaultConnectorConfig>` from `@kubricate/core`
- Package scaffolding under `packages/plugin-azure-keyvault/`
- Unit tests (vitest, colocated)
- Export via `packages/plugin-azure-keyvault/src/index.ts`
- Example under `examples/with-azure-keyvault/` showing `AzureKeyVaultConnector` wired into a `SecretManager` with a `kubricate.config.ts`, mirroring the structure of `examples/with-secret-manager/`

**Out of scope:**
- Azure Key Vault Provider (will be a future milestone)
- Any CLI changes
- Documentation website updates

## Connector Behavior

### Config Shape

```ts
export interface AzureKeyVaultConnectorConfig {
  /** Full vault URL, e.g. https://my-vault.vault.azure.net/ */
  vaultUrl: string;
  /** Optional prefix prepended to every secret name before lookup */
  prefix?: string;
  /** Optional custom credential; defaults to new DefaultAzureCredential() */
  credential?: TokenCredential;
}
```

### Authentication

- Default: `new DefaultAzureCredential()` from `@azure/identity`
- Override: accept any `TokenCredential` passed via `config.credential`

### `load(names: string[])`

- Prepend `config.prefix` (if set) to each name before fetching from Key Vault
- Call `SecretClient.getSecret(prefixedName)` for each name
- Attempt JSON-parse on the returned string value (flat object if valid, raw string otherwise) — mirrors `EnvConnector.tryParseSecretValue()`
- On 404: throw `"Secret '<name>' not found in Key Vault <vaultUrl>"`
- On other errors: re-throw with context

### `get(name: string)`

- Return the loaded secret value
- Throw if `load()` was not called first: `"Secret '<name>' not loaded. Did you call load()?"`

### `setWorkingDir` / `getWorkingDir`

- Not needed for Key Vault (no local file reading); omit these methods

## Success Criteria

- [ ] `pnpm build` passes for `@kubricate/plugin-azure-keyvault`
- [ ] `pnpm test` passes with unit tests covering: successful load, prefix handling, 404 error, JSON-parse behavior, get-before-load error
- [ ] `pnpm lint:check` passes
- [ ] Package is importable: `import { AzureKeyVaultConnector } from '@kubricate/plugin-azure-keyvault'`
- [ ] `examples/with-azure-keyvault/` compiles and type-checks cleanly (`check-types` passes)
