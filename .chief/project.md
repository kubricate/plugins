# Project: Kubricate Plugins

This repo is the **official home of Kubricate plugins** for 3rd-party platforms. It is not the main Kubricate library (that lives at [thaitype/kubricate](https://github.com/kubricate/kubricate)). Each plugin is published as an independent `@kubricate/plugin-*` package that integrates an external platform (e.g. Azure Key Vault, 1Password, Vault) with the Kubricate secret management system.

## Project Overview

This is a **pnpm monorepo** using **Turbo** for build orchestration and **Changesets** for versioning.

- Each `packages/plugin-*/` is a standalone plugin for a specific platform
- `packages/dummy/` is a placeholder package until the first real plugin lands
- Plugins extend `BaseConnector` or `BaseProvider` from `@kubricate/core` (external dependency)
- Independent versioning: each plugin is versioned separately

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Development mode (watch, excludes examples and template)
pnpm dev
```

### Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
pnpm test:view-report
```

### Linting & Formatting

```bash
pnpm lint:check       # Check linting and types
pnpm lint:fix         # Fix linting issues
pnpm format           # Check formatting
pnpm format:fix       # Fix formatting
pnpm all              # build + lint + test
```

### Per-Package

```bash
# From within a package directory
pnpm test
pnpm test:watch

# Or via Turbo filter from root
turbo test --filter=@kubricate/dummy
```

### Package Management & Versioning

```bash
pnpm changeset          # Create a changeset before publishing
changeset version       # Version packages (done by CI)
changeset publish       # Publish to npm (done by CI)
```

## Monorepo Structure

```
packages/
└── dummy/              # Template package — copy to create a new plugin

examples/
└── with-secret-manager/  # Example showing plugin usage with SecretManager

tools/
├── mono/               # Build tool wrapper (@thaitype/mono-scripts)
└── template/           # New package scaffold

configs/
├── config-eslint/
├── config-typescript/
└── config-vitest/
```

## Adding a New Plugin

1. Copy `tools/template/` to `packages/plugin-<name>/`
2. Update `package.json` (name, description, dependencies)
3. Implement `BaseConnector` or `BaseProvider` from `@kubricate/core`
4. Add the new package to `pnpm-workspace.yaml` if needed
5. Run `pnpm install` and `pnpm build`

## Architecture Notes

Plugins extend one of two base classes from `@kubricate/core`:

- **Connector** (`BaseConnector`) — reads secrets from an external source (e.g. Azure KV, .env)
  - Implements: `load()`, `save()`, `exists()`
- **Provider** (`BaseProvider`) — converts secrets into Kubernetes resources or injection payloads
  - Implements: `prepare()`, `getInjectionPayload()`, `getTargetPath()`

## Build System

- **Turbo** manages task execution and caching (`turbo.json`)
- **`mono` tool** wraps TypeScript compilation (dual ESM/CJS output to `dist/`)
- Build order enforced via `dependsOn: ["^build"]` in `turbo.json`

## Versioning

- All plugins use **independent versioning**
- Changesets workflow: create changeset → CI opens release PR → merge to publish

## Node Version

Requires **Node.js >= 22**
