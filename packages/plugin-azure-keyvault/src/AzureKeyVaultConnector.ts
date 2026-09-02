import { DefaultAzureCredential, type TokenCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

import type { BaseConnector, BaseLogger, SecretValue } from '@kubricate/core';

import { AzureKeyVaultNameConverter } from './AzureKeyVaultNameConverter.js';

export interface AzureKeyVaultConnectorConfig {
  /** Full vault URL, e.g. https://my-vault.vault.azure.net/ */
  vaultUrl: string;
  /** Optional prefix prepended to every secret name before Key Vault lookup, e.g. `sample1-dev` */
  prefix?: string;
  /** Optional credential; defaults to new DefaultAzureCredential() */
  credential?: TokenCredential;
}

export class AzureKeyVaultConnector implements BaseConnector<AzureKeyVaultConnectorConfig> {
  public config: AzureKeyVaultConnectorConfig;
  public logger?: BaseLogger;
  private secrets = new Map<string, SecretValue>();
  private client?: SecretClient;
  private nameConverter: AzureKeyVaultNameConverter;

  constructor(config: AzureKeyVaultConnectorConfig) {
    this.config = config;
    this.nameConverter = new AzureKeyVaultNameConverter({ prefix: config.prefix });
  }

  private getClient(): SecretClient {
    if (!this.client) {
      const credential = this.config.credential ?? new DefaultAzureCredential();
      this.client = new SecretClient(this.config.vaultUrl, credential);
    }
    return this.client;
  }

  /**
   * Resolve every name up-front, so keys that collapse to the same Key Vault name
   * (e.g. `APISERVER` and `ApiServer` both become `apiserver`) fail before any request.
   * Keying by secret name also deduplicates a key that was listed more than once.
   *
   * @returns Key Vault secret name -> the application key it was resolved from.
   */
  private resolveSecretNames(names: string[]): Map<string, string> {
    const nameBySecretName = new Map<string, string>();

    for (const name of names) {
      const secretName = this.nameConverter.toSecretName(name);
      const owner = nameBySecretName.get(secretName);
      if (owner && owner !== name) {
        throw new Error(
          `Secrets '${owner}' and '${name}' both resolve to the Key Vault name '${secretName}'. Rename one of them.`
        );
      }
      nameBySecretName.set(secretName, name);
    }

    return nameBySecretName;
  }

  async load(names: string[]): Promise<void> {
    const nameBySecretName = this.resolveSecretNames(names);
    const client = this.getClient();

    for (const [lookupName, name] of nameBySecretName) {
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
