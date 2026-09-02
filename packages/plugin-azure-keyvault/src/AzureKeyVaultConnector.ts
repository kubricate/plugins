import { DefaultAzureCredential, type TokenCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

import type { BaseConnector, BaseLogger, SecretValue } from '@kubricate/core';

export interface AzureKeyVaultConnectorConfig {
  /** Full vault URL, e.g. https://my-vault.vault.azure.net/ */
  vaultUrl: string;
  /**
   * Optional prefix prepended directly to every secret name before Key Vault lookup, so
   * `prod-` resolves `MY_DB_PASSWORD` to `prod-MY_DB_PASSWORD`. When
   * {@link AzureKeyVaultConnectorConfig.resolveSecretName} is set it receives this as its
   * second argument instead and decides where the prefix goes.
   */
  prefix?: string;
  /** Optional credential; defaults to new DefaultAzureCredential() */
  credential?: TokenCredential;
  /**
   * Optional transform from application key to Key Vault secret name, replacing the
   * default `prefix + name` concatenation. The resolver owns the whole name, including
   * where `prefix` goes, which is handed in as the second argument (`''` when unset).
   * Declare only `name` to ignore the prefix.
   *
   * The connector imposes no naming convention of its own, so any lowercasing or `_` to
   * `-` conversion belongs here.
   *
   * @example
   * ```ts
   * resolveSecretName: (name, prefix) => {
   *   const normalized = name.toLowerCase().replace(/_/g, '-');
   *   return prefix ? `${prefix}-${normalized}` : normalized;
   * }
   * ```
   */
  resolveSecretName?: (name: string, prefix: string) => string;
}

export class AzureKeyVaultConnector implements BaseConnector<AzureKeyVaultConnectorConfig> {
  public config: AzureKeyVaultConnectorConfig;
  public logger?: BaseLogger;
  private secrets = new Map<string, SecretValue>();
  private client?: SecretClient;

  constructor(config: AzureKeyVaultConnectorConfig) {
    this.config = config;
  }

  private getClient(): SecretClient {
    if (!this.client) {
      const credential = this.config.credential ?? new DefaultAzureCredential();
      this.client = new SecretClient(this.config.vaultUrl, credential);
    }
    return this.client;
  }

  /**
   * Read `config` on every call rather than capturing it in the constructor, so mutating
   * `connector.config.prefix` after construction still takes effect.
   */
  private resolveName(name: string): string {
    const { prefix = '', resolveSecretName } = this.config;
    return resolveSecretName ? resolveSecretName(name, prefix) : prefix + name;
  }

  /**
   * Resolve every key before the first request, so a resolver that rejects one key leaves
   * nothing half-loaded. Repeating a key collapses into a single lookup, while two
   * distinct keys landing on the same Key Vault name (e.g. `APISERVER` and `ApiServer`
   * under a lowercasing resolver) is a configuration error rather than a shared secret.
   *
   * @returns pairs of Key Vault secret name and the application key it was resolved from.
   */
  private resolveLookups(names: string[]): Array<readonly [string, string]> {
    const nameByLookup = new Map<string, string>();

    for (const name of new Set(names)) {
      const lookupName = this.resolveName(name);
      const existing = nameByLookup.get(lookupName);
      if (existing !== undefined) {
        throw new Error(`Secret name collision: '${existing}' and '${name}' both resolve to '${lookupName}'`);
      }
      nameByLookup.set(lookupName, name);
    }

    return [...nameByLookup.entries()];
  }

  async load(names: string[]): Promise<void> {
    const lookups = this.resolveLookups(names);
    const client = this.getClient();

    for (const [lookupName, name] of lookups) {
      this.logger?.debug(`Loading secret: ${lookupName}`);
      try {
        const result = await client.getSecret(lookupName);
        this.secrets.set(name, this.tryParseSecretValue(result.value ?? ''));
        this.logger?.debug(`Loaded secret: ${name}`);
      } catch (err: unknown) {
        if (isRestError(err) && err.statusCode === 404) {
          throw new Error(
            `Secret '${lookupName}' not found in Key Vault ${this.config.vaultUrl} (resolved from '${name}')`
          );
        }
        throw err;
      }
    }
  }

  get(name: string): SecretValue {
    if (!this.secrets.has(name)) {
      throw new Error(`Secret '${name}' not loaded. Did you call load()?`);
    }
    return this.secrets.get(name)!;
  }

  tryParseSecretValue(value: string): SecretValue {
    try {
      const parsed = JSON.parse(value);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed) &&
        Object.values(parsed).every(
          v => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null
        )
      ) {
        return parsed;
      }
      return value;
    } catch {
      return value;
    }
  }
}

function isRestError(err: unknown): err is { statusCode: number } {
  return typeof err === 'object' && err !== null && 'statusCode' in err;
}
