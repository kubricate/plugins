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

/** The kebab-case convention documented in `examples/with-azure-keyvault`. */
const kebabCase = (name: string, prefix: string) => {
  const normalized = name.toLowerCase().replace(/_/g, '-');
  return prefix ? `${prefix}-${normalized}` : normalized;
};

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

  it('no prefix and no resolver — the key is queried verbatim', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dbpassword' });
    const connector = new AzureKeyVaultConnector({ vaultUrl: 'https://my-vault.vault.azure.net/' });
    await connector.load(['MY_DB_PASSWORD']);
    expect(mockGetSecret).toHaveBeenCalledWith('MY_DB_PASSWORD');
    expect(connector.get('MY_DB_PASSWORD')).toBe('dbpassword');
  });

  it('prefix without resolver — is concatenated onto the key unchanged (legacy behavior)', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dbpassword' });
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      prefix: 'prod-',
    });
    await connector.load(['MY_DB_PASSWORD']);
    expect(mockGetSecret).toHaveBeenCalledWith('prod-MY_DB_PASSWORD');
    expect(connector.get('MY_DB_PASSWORD')).toBe('dbpassword');
  });

  it('prefix mutated after construction — load uses the current config value', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dburl' });
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      prefix: 'dev-',
    });
    connector.config.prefix = 'prod-';
    await connector.load(['DATABASE_URL']);
    expect(mockGetSecret).toHaveBeenCalledWith('prod-DATABASE_URL');
  });

  it('repeated identical names — are deduplicated into a single request', async () => {
    mockGetSecret.mockResolvedValue({ value: 'myvalue' });
    const connector = new AzureKeyVaultConnector({ vaultUrl: 'https://my-vault.vault.azure.net/' });
    await connector.load(['DB', 'DB']);
    expect(mockGetSecret).toHaveBeenCalledWith('DB');
    expect(mockGetSecret).toHaveBeenCalledTimes(1);
    expect(connector.get('DB')).toBe('myvalue');
  });

  it('resolveSecretName — owns the whole Key Vault name', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dbpassword' });
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      resolveSecretName: name => `custom-${name}`,
    });
    await connector.load(['MY_DB_PASSWORD']);
    expect(mockGetSecret).toHaveBeenCalledWith('custom-MY_DB_PASSWORD');
    expect(connector.get('MY_DB_PASSWORD')).toBe('dbpassword');
  });

  it('resolveSecretName — receives the configured prefix as its second argument', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dbpassword' });
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      prefix: 'sample1-dev',
      resolveSecretName: kebabCase,
    });
    await connector.load(['MY_DB_PASSWORD']);
    expect(mockGetSecret).toHaveBeenCalledWith('sample1-dev-my-db-password');
    expect(connector.get('MY_DB_PASSWORD')).toBe('dbpassword');
  });

  it('resolveSecretName — receives an empty prefix when none is configured', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dbpassword' });
    const seen: string[] = [];
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      resolveSecretName: (name, prefix) => {
        seen.push(prefix);
        return kebabCase(name, prefix);
      },
    });
    await connector.load(['MY_DB_PASSWORD']);
    expect(seen).toEqual(['']);
    expect(mockGetSecret).toHaveBeenCalledWith('my-db-password');
  });

  it('resolveSecretName — may declare only name and ignore the prefix', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dbpassword' });
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      prefix: 'sample1-dev',
      resolveSecretName: name => name.toLowerCase(),
    });
    await connector.load(['MY_DB_PASSWORD']);
    expect(mockGetSecret).toHaveBeenCalledWith('my_db_password');
  });

  it('resolved-name collision — load rejects before any Key Vault request', async () => {
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      resolveSecretName: name => name.toLowerCase(),
    });
    await expect(connector.load(['APISERVER', 'ApiServer'])).rejects.toThrow(
      "Secret name collision: 'APISERVER' and 'ApiServer' both resolve to 'apiserver'"
    );
    expect(mockGetSecret).not.toHaveBeenCalled();
  });

  it('resolveSecretName throws — nothing is fetched, even for keys resolved earlier', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dbpassword' });
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      resolveSecretName: name => {
        if (name === 'SECOND') throw new Error('rejected by convention');
        return name.toLowerCase();
      },
    });
    await expect(connector.load(['FIRST', 'SECOND'])).rejects.toThrow('rejected by convention');
    expect(mockGetSecret).not.toHaveBeenCalled();
  });

  it('404 error — reports the queried Key Vault name and the application key', async () => {
    mockGetSecret.mockRejectedValue({ statusCode: 404 });
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      prefix: 'sample1-dev',
      resolveSecretName: kebabCase,
    });
    await expect(connector.load(['MY_DB_PASSWORD'])).rejects.toThrow(
      "Secret 'sample1-dev-my-db-password' not found in Key Vault https://my-vault.vault.azure.net/ (resolved from 'MY_DB_PASSWORD')"
    );
  });

  it('resolveSecretName — uses the current prefix when config is mutated', async () => {
    mockGetSecret.mockResolvedValue({ value: 'dbpassword' });

    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      prefix: 'dev',
      resolveSecretName: kebabCase,
    });

    connector.config.prefix = 'prod';

    await connector.load(['MY_DB_PASSWORD']);

    expect(mockGetSecret).toHaveBeenCalledWith('prod-my-db-password');
  });

  it('multiple names — stores values under their original application keys', async () => {
    mockGetSecret.mockResolvedValueOnce({ value: 'user-secret' }).mockResolvedValueOnce({ value: 'pass-secret' });

    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
      prefix: 'prod',
      resolveSecretName: kebabCase,
    });

    await connector.load(['DB_USER', 'DB_PASSWORD']);

    expect(mockGetSecret).toHaveBeenNthCalledWith(1, 'prod-db-user');

    expect(mockGetSecret).toHaveBeenNthCalledWith(2, 'prod-db-password');

    expect(connector.get('DB_USER')).toBe('user-secret');
    expect(connector.get('DB_PASSWORD')).toBe('pass-secret');
  });

  it('empty names — performs no Key Vault requests', async () => {
    const connector = new AzureKeyVaultConnector({
      vaultUrl: 'https://my-vault.vault.azure.net/',
    });

    await connector.load([]);

    expect(mockGetSecret).not.toHaveBeenCalled();
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
