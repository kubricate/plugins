import { AzureKeyVaultConnector } from '@kubricate/plugin-azure-keyvault';
import { OpaqueSecretProvider } from '@kubricate/plugin-kubernetes';
import { SecretManager } from 'kubricate';

export const secretManager = new SecretManager()
  .addConnector(
    'AzureKeyVaultConnector',
    new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      // prefix: 'myapp/',
      // credential: new ClientSecretCredential(tenantId, clientId, clientSecret),
    })
  )
  .addProvider('OpaqueSecretProvider', new OpaqueSecretProvider({ name: 'app-secrets' }))
  .setDefaultConnector('AzureKeyVaultConnector')
  .setDefaultProvider('OpaqueSecretProvider')
  .addSecret({ name: 'MY_APP_KEY' })
  .addSecret({ name: 'MY_DB_PASSWORD' });
