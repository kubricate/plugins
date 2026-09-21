# Contract: Package Structure

## Package Name

`@kubricate/plugin-azure-keyvault`

## Directory Layout

```
packages/plugin-azure-keyvault/
├── src/
│   ├── AzureKeyVaultConnector.ts       # Connector implementation
│   ├── AzureKeyVaultConnector.test.ts  # Unit tests (vitest)
│   └── index.ts                        # Public exports
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── vitest.config.ts
```

## package.json Shape

```json
{
  "name": "@kubricate/plugin-azure-keyvault",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/dts/index.d.ts",
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "types": "./dist/dts/index.d.ts",
      "import": "./dist/esm/index.js",
      "default": "./dist/cjs/index.js"
    }
  },
  "files": ["dist", "src", "package.json", "README.md"],
  "scripts": {
    "dev": "mono dev",
    "build": "mono build",
    "test": "mono test",
    "test:watch": "mono test:watch",
    "lint:check": "mono lint:check",
    "lint:fix": "mono lint:fix",
    "check-types": "mono check-types"
  },
  "dependencies": {
    "@azure/identity": "^4.x",
    "@azure/keyvault-secrets": "^4.x"
  },
  "peerDependencies": {
    "@kubricate/core": "^0.22.0"
  },
  "devDependencies": {
    "@kubricate/config-eslint": "workspace:*",
    "@kubricate/config-typescript": "workspace:*",
    "@kubricate/config-vitest": "workspace:*",
    "@kubricate/core": "workspace:*",
    "@kubricate/mono": "workspace:*",
    "@types/node": "^22.x"
  }
}
```

## Versioning

- Independent versioning (not fixed with `kubricate` core)
- Initial version: `0.0.1` (pre-release, not yet in the main kubricate release train)
