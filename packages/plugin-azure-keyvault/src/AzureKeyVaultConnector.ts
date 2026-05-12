import { DefaultAzureCredential, type TokenCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import type { BaseConnector, BaseLogger, SecretValue } from '@kubricate/core';

export interface AzureKeyVaultConnectorConfig {
  /** Full vault URL, e.g. https://my-vault.vault.azure.net/ */
  vaultUrl: string;
  /** Optional prefix prepended to every secret name before Key Vault lookup */
  prefix?: string;
  /** Optional credential; defaults to new DefaultAzureCredential() */
  credential?: TokenCredential;
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

  async load(names: string[]): Promise<void> {
    const client = this.getClient();
    const prefix = this.config.prefix ?? '';

    for (const name of names) {
      const lookupName = prefix + name;
      this.logger?.debug(`Loading secret: ${lookupName}`);
      try {
        const result = await client.getSecret(lookupName);
        this.secrets.set(name, this.tryParseSecretValue(result.value ?? ''));
        this.logger?.debug(`Loaded secret: ${name}`);
      } catch (err: unknown) {
        if (isRestError(err) && err.statusCode === 404) {
          throw new Error(`Secret '${name}' not found in Key Vault ${this.config.vaultUrl}`);
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
