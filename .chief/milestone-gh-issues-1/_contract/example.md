# Contract: Example — with-azure-keyvault

## Directory Layout

```
examples/with-azure-keyvault/
├── src/
│   ├── setup-secrets.ts   # SecretManager wiring with AzureKeyVaultConnector
│   └── stacks.ts          # Stack definitions using the secret manager
├── .env.example           # Documents required env vars for local auth
├── kubricate.config.ts    # defineConfig() entry point
├── package.json
├── tsconfig.json
└── eslint.config.mjs
```

## package.json Shape

```json
{
  "name": "@examples/with-azure-keyvault",
  "type": "module",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "kbr": "kbr",
    "lint:check": "mono lint:check",
    "check-types": "mono check-types"
  },
  "dependencies": {
    "@kubricate/core": "^0.22.0",
    "@kubricate/plugin-azure-keyvault": "workspace:*",
    "@kubricate/plugin-kubernetes": "^0.22.0",
    "@kubricate/stacks": "^0.22.0",
    "kubricate": "^0.22.0"
  },
  "devDependencies": {
    "@kubricate/config-eslint": "workspace:*",
    "@kubricate/config-typescript": "workspace:*",
    "@kubricate/mono": "workspace:*"
  }
}
```

## setup-secrets.ts Shape

```ts
import { AzureKeyVaultConnector } from '@kubricate/plugin-azure-keyvault';
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes';
import { SecretManager } from 'kubricate';

export const secretManager = new SecretManager()
  .addConnector('AzureKeyVaultConnector', new AzureKeyVaultConnector({
    vaultUrl: 'https://my-vault.vault.azure.net/',
    // credential: new ClientSecretCredential(...) // optional override
  }))
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .setDefaultConnector('AzureKeyVaultConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'MY_APP_KEY' })
  .addSecret({ name: 'MY_DB_PASSWORD' });
```

## .env.example Contents

```bash
# Azure CLI or environment-based auth (used by DefaultAzureCredential)
# Run `az login` locally, or set these for service principal auth:
# AZURE_TENANT_ID=
# AZURE_CLIENT_ID=
# AZURE_CLIENT_SECRET=
```

## Constraints

- Example must compile and type-check (`check-types` passes) with the workspace version of `@kubricate/plugin-azure-keyvault`
- No runtime execution required (no live Azure vault connection in CI)
- `kubricate.config.ts` must use `defineConfig()` from `kubricate`
