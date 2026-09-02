import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AzureKeyVaultConnector } from './AzureKeyVaultConnector.js';

vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn().mockImplementation(() => ({})),
}));

const mockGetSecret = vi.fn();
vi.mock('@azure/keyvault-secrets', () => ({
  SecretClient: vi.fn().mockImplementation(() => ({
    getSecret: mockGetSecret,
  })),
}));

describe('AzureKeyVaultConnector', () => {
  beforeEach(() => {
    mockGetSecret.mockReset();
  });

  it('load success — get returns the secret value', async () => {
    mockGetSecret.mockResolvedValue({ value: 'myvalue' });
    const connector = new AzureKeyVaultConnector({ vaultUrl: 'https://my-vault.vault.azure.net/' });
    await connector.load(['DB']);
    expect(connector.get('DB')).toBe('myvalue');
  });

  it('prefix handling — getSecret is called with the converted, prefixed name', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dbpassword' });
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      prefix: 'sample1-dev',
    });
    await connector.load(['MY_DB_PASSWORD']);
    expect(mockGetSecret).toHaveBeenCalledWith('sample1-dev-my-db-password');
    expect(connector.get('MY_DB_PASSWORD')).toBe('dbpassword');
  });

  it('no prefix — getSecret is called with the converted name', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dbpassword' });
    const connector = new AzureKeyVaultConnector({ vaultUrl: 'https://my-vault.vault.azure.net/' });
    await connector.load(['MY_DB_PASSWORD']);
    expect(mockGetSecret).toHaveBeenCalledWith('my-db-password');
    expect(connector.get('MY_DB_PASSWORD')).toBe('dbpassword');
  });

  it('legacy slash-suffixed prefix prod/ — getSecret is called with a valid Key Vault name', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dbpassword' });
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      prefix: 'prod/',
    });
    await connector.load(['MY_DB_PASSWORD']);
    expect(mockGetSecret).toHaveBeenCalledWith('prod-my-db-password');
    expect(connector.get('MY_DB_PASSWORD')).toBe('dbpassword');
  });

  it('prefix normalization — an upper snake case prefix resolves to kebab case', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dbpassword' });
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      prefix: 'SAMPLE1_DEV',
    });
    await connector.load(['MY_DB_PASSWORD']);
    expect(mockGetSecret).toHaveBeenCalledWith('sample1-dev-my-db-password');
  });

  it('separator-less names — getSecret is called without word splitting', async () => {
    mockGetSecret.mockResolvedValue({ value: 'somevalue' });
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      prefix: 'smoi-cms-dev',
    });
    await connector.load(['APISERVER', 'DefaultConnection']);
    expect(mockGetSecret).toHaveBeenCalledWith('smoi-cms-dev-apiserver');
    expect(mockGetSecret).toHaveBeenCalledWith('smoi-cms-dev-defaultconnection');
    expect(connector.get('DefaultConnection')).toBe('somevalue');
  });

  it('colliding names — load rejects before any Key Vault request', async () => {
    const connector = new AzureKeyVaultConnector({ vaultUrl: 'https://my-vault.vault.azure.net/' });
    await expect(connector.load(['APISERVER', 'ApiServer'])).rejects.toThrow(
      "Secrets 'APISERVER' and 'ApiServer' both resolve to the Key Vault name 'apiserver'"
    );
    expect(mockGetSecret).not.toHaveBeenCalled();
  });

  it('colliding names via separators — MY_DB_PASSWORD and MY__DB__PASSWORD are rejected', async () => {
    const connector = new AzureKeyVaultConnector({ vaultUrl: 'https://my-vault.vault.azure.net/' });
    await expect(connector.load(['MY_DB_PASSWORD', 'MY__DB__PASSWORD'])).rejects.toThrow(
      'both resolve to the Key Vault name'
    );
  });

  it('repeated identical names — are deduplicated instead of treated as a collision', async () => {
    mockGetSecret.mockResolvedValue({ value: 'myvalue' });
    const connector = new AzureKeyVaultConnector({ vaultUrl: 'https://my-vault.vault.azure.net/' });
    await connector.load(['DB', 'DB']);
    expect(mockGetSecret).toHaveBeenCalledTimes(1);
    expect(connector.get('DB')).toBe('myvalue');
  });

  it('404 error — load rejects with "not found in Key Vault"', async () => {
    mockGetSecret.mockRejectedValue({ statusCode: 404 });
    const connector = new AzureKeyVaultConnector({ vaultUrl: 'https://my-vault.vault.azure.net/' });
    await expect(connector.load(['MISSING'])).rejects.toThrow('not found in Key Vault');
  });

  it('JSON-parse flat object — get returns parsed object', async () => {
    mockGetSecret.mockResolvedValue({ value: '{"user":"alice","pass":"secret"}' });
    const connector = new AzureKeyVaultConnector({ vaultUrl: 'https://my-vault.vault.azure.net/' });
    await connector.load(['CREDS']);
    expect(connector.get('CREDS')).toEqual({ user: 'alice', pass: 'secret' });
  });

  it('get-before-load — throws containing "not loaded"', () => {
    const connector = new AzureKeyVaultConnector({ vaultUrl: 'https://my-vault.vault.azure.net/' });
    expect(() => connector.get('X')).toThrow('not loaded');
  });

  it('non-404 error bubbles — load rejects with original error', async () => {
    const authError = new Error('auth failed');
    mockGetSecret.mockRejectedValue(authError);
    const connector = new AzureKeyVaultConnector({ vaultUrl: 'https://my-vault.vault.azure.net/' });
    await expect(connector.load(['SECRET'])).rejects.toThrow('auth failed');
  });
});
