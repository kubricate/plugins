import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn().mockImplementation(() => ({})),
}));

const mockGetSecret = vi.fn();
vi.mock('@azure/keyvault-secrets', () => ({
  SecretClient: vi.fn().mockImplementation(() => ({
    getSecret: mockGetSecret,
  })),
}));

import { AzureKeyVaultConnector } from './AzureKeyVaultConnector.js';

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

  it('prefix handling — getSecret is called with prefixed name', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dbpassword' });
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      prefix: 'prod/',
    });
    await connector.load(['DB']);
    expect(mockGetSecret).toHaveBeenCalledWith('prod/DB');
    expect(connector.get('DB')).toBe('dbpassword');
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
