# Contract: AzureKeyVaultConnector

## TypeScript Interface

```ts
import type { TokenCredential } from '@azure/identity';
import type { BaseConnector, BaseLogger, SecretValue } from '@kubricate/core';

export interface AzureKeyVaultConnectorConfig {
  /** Full vault URL. e.g. https://my-vault.vault.azure.net/ */
  vaultUrl: string;
  /** Optional prefix prepended to every secret name before Key Vault lookup. */
  prefix?: string;
  /** Optional credential. Defaults to new DefaultAzureCredential(). */
  credential?: TokenCredential;
}

export class AzureKeyVaultConnector implements BaseConnector<AzureKeyVaultConnectorConfig> {
  public config: AzureKeyVaultConnectorConfig;
  public logger?: BaseLogger;

  constructor(config: AzureKeyVaultConnectorConfig);

  /** Load and cache secrets from Key Vault by logical name. Must be called before get(). */
  load(names: string[]): Promise<void>;

  /** Return a cached secret value. Throws if not loaded. */
  get(name: string): SecretValue;

  /** Attempt JSON-parse; return flat object if valid, raw string otherwise. */
  tryParseSecretValue(value: string): SecretValue;
}
```

## Behavior Contracts

### `constructor(config)`
- `config.vaultUrl` is required. No default.
- `config.prefix` defaults to `''` (empty string, no prefix).
- `config.credential` defaults to `new DefaultAzureCredential()` (lazy — instantiated on first `load()` call, not in constructor).

### `load(names: string[])`
- For each name in `names`:
  1. Compute `lookupName = (config.prefix ?? '') + name`
  2. Call `SecretClient.getSecret(lookupName)`
  3. Call `tryParseSecretValue(result.value)` and store under the original `name` (not prefixed)
- On Azure `RestError` with `statusCode === 404`:
  - Throw: `Secret '${name}' not found in Key Vault ${config.vaultUrl}`
- On any other error: re-throw as-is with context message prepended.

### `get(name: string)`
- Returns `SecretValue` for `name` from internal cache.
- Throws `Secret '${name}' not loaded. Did you call load()?` if not present.

### `tryParseSecretValue(value: string): SecretValue`
- Attempt `JSON.parse(value)`.
- If result is a non-null, non-array object whose every value is `string | number | boolean | null` → return the flat object.
- Otherwise → return the original raw string.
- On JSON parse error → return the original raw string.

## Dependencies

```json
{
  "dependencies": {
    "@azure/identity": "^4.x",
    "@azure/keyvault-secrets": "^4.x"
  },
  "peerDependencies": {
    "@kubricate/core": "^0.22.0"
  }
}
```

## Exports

`packages/plugin-azure-keyvault/src/index.ts` must export:
- `AzureKeyVaultConnector`
- `AzureKeyVaultConnectorConfig`
