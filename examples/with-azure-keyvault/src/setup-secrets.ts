import { AzureKeyVaultConnector } from '@kubricate/plugin-azure-keyvault';
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes';
import { SecretManager } from 'kubricate';

/**
 * Project naming convention for Azure Key Vault secrets.
 *
 * Key Vault secret names allow only alphanumerics and hyphens, so the usual
 * `UPPER_SNAKE_CASE` application keys below cannot be looked up as-is — the connector's
 * default `prefix + name` concatenation would produce an illegal name. This module owns
 * the translation and is passed in as `resolveSecretName`, which receives the configured
 * `prefix` as its second argument.
 *
 *   prefix = project-prod
 *   MY_DB_PASSWORD         -> project-prod-my-db-password
 *   MY__DB__PASSWORD       -> project-prod-my--db--password
 *   EmailService__Password -> project-prod-emailservice--password
 *
 * `__` maps to `--` on purpose: Key Vault allows consecutive hyphens in secret names, so
 * the ASP.NET Core nesting separator stays distinct from a single `_`.
 */

/** Azure Key Vault allows 1-127 characters of alphanumerics and hyphens only. */
const MAX_SECRET_NAME_LENGTH = 127;

function normalizeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Drop-in `resolveSecretName` for `AzureKeyVaultConnector`. */
export function toSecretName(name: string, prefix = ''): string {
  const normalized = normalizeSegment(name);
  if (!normalized) {
    throw new Error(`Secret name '${name}' cannot be converted to a valid Key Vault name`);
  }

  const normalizedPrefix = normalizeSegment(prefix);
  const secretName = normalizedPrefix ? `${normalizedPrefix}-${normalized}` : normalized;
  if (secretName.length > MAX_SECRET_NAME_LENGTH) {
    throw new Error(`Secret name '${secretName}' exceeds the Key Vault limit of ${MAX_SECRET_NAME_LENGTH} characters`);
  }

  return secretName;
}

export const secretManager = new SecretManager()
  .addConnector(
    'AzureKeyVaultConnector',
    new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      prefix: 'project-prod',
      resolveSecretName: toSecretName,
      // credential: new ClientSecretCredential(tenantId, clientId, clientSecret),
    })
  )
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .setDefaultConnector('AzureKeyVaultConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'MY_APP_KEY' })
  .addSecret({ name: 'MY_DB_PASSWORD' })
  .addSecret({ name: 'EmailService__Password' });
