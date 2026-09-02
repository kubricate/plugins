/** Azure Key Vault allows 1-127 characters of alphanumerics and hyphens only. */
const MAX_SECRET_NAME_LENGTH = 127;

export interface AzureKeyVaultNameConverterConfig {
  /** Optional prefix prepended to every secret name; normalized with the same convention */
  prefix?: string;
}

/**
 * Converts application/env keys (usually `UPPER_SNAKE_CASE`) into Azure Key Vault
 * secret names (`kebab-case`), so callers never have to know the stored form.
 *
 * This is the single source of truth for the naming convention — the connector and any
 * future writer/importer must both go through it.
 *
 * @example
 * ```ts
 * const converter = new AzureKeyVaultNameConverter({ prefix: 'sample1-dev' });
 * converter.toSecretName('MY_DB_PASSWORD'); // 'sample1-dev-my-db-password'
 * ```
 */
export class AzureKeyVaultNameConverter {
  private readonly prefix: string;

  constructor(config: AzureKeyVaultNameConverterConfig = {}) {
    this.prefix = normalizeSegment(config.prefix ?? '');
  }

  /** Resolve an application/env key to the Azure Key Vault secret name it is stored under. */
  toSecretName(name: string): string {
    const normalized = normalizeSegment(name);
    if (!normalized) {
      throw new Error(`Secret name '${name}' cannot be converted to a valid Key Vault name`);
    }

    const secretName = this.prefix ? `${this.prefix}-${normalized}` : normalized;
    if (secretName.length > MAX_SECRET_NAME_LENGTH) {
      throw new Error(
        `Secret name '${secretName}' exceeds the Key Vault limit of ${MAX_SECRET_NAME_LENGTH} characters`
      );
    }

    return secretName;
  }
}

/** Lowercase, collapse every unsupported character into a single hyphen, and trim hyphens. */
function normalizeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
