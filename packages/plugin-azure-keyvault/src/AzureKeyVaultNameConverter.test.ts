import { describe, expect, it } from 'vitest';

import { AzureKeyVaultNameConverter } from './AzureKeyVaultNameConverter.js';

describe('AzureKeyVaultNameConverter', () => {
  it('no prefix — converts upper snake case to kebab case', () => {
    const converter = new AzureKeyVaultNameConverter();
    expect(converter.toSecretName('MY_DB_PASSWORD')).toBe('my-db-password');
    expect(converter.toSecretName('DATABASE_URL')).toBe('database-url');
    expect(converter.toSecretName('JWT_PRIVATE_KEY')).toBe('jwt-private-key');
  });

  it('sequential separators — collapses to a single hyphen', () => {
    const converter = new AzureKeyVaultNameConverter();
    expect(converter.toSecretName('MY__DB__PASSWORD')).toBe('my-db-password');
  });

  it('leading/trailing separators — are removed', () => {
    const converter = new AzureKeyVaultNameConverter();
    expect(converter.toSecretName('_MY_DB_PASSWORD_')).toBe('my-db-password');
  });

  it('invalid characters — are normalized into hyphens', () => {
    const converter = new AzureKeyVaultNameConverter();
    expect(converter.toSecretName('MY.DB/PASSWORD')).toBe('my-db-password');
    expect(converter.toSecretName('my db password')).toBe('my-db-password');
  });

  it('names without separators — are lowercased but not split into words', () => {
    const converter = new AzureKeyVaultNameConverter();
    expect(converter.toSecretName('APISERVER')).toBe('apiserver');
    expect(converter.toSecretName('DefaultConnection')).toBe('defaultconnection');
    expect(converter.toSecretName('TOKEN')).toBe('token');
  });

  it('casing is not a separator — APISERVER and ApiServer resolve to the same name', () => {
    const converter = new AzureKeyVaultNameConverter();
    expect(converter.toSecretName('APISERVER')).toBe('apiserver');
    expect(converter.toSecretName('ApiServer')).toBe('apiserver');
    expect(converter.toSecretName('API_SERVER')).toBe('api-server');
  });

  it('kebab-case prefix — is prepended', () => {
    const converter = new AzureKeyVaultNameConverter({ prefix: 'sample1-dev' });
    expect(converter.toSecretName('MY_DB_PASSWORD')).toBe('sample1-dev-my-db-password');
  });

  it('upper snake case prefix — is normalized with the same convention', () => {
    const converter = new AzureKeyVaultNameConverter({ prefix: 'SAMPLE1_DEV' });
    expect(converter.toSecretName('MY_DB_PASSWORD')).toBe('sample1-dev-my-db-password');
  });

  it('lower snake case prefix — is normalized with the same convention', () => {
    const converter = new AzureKeyVaultNameConverter({ prefix: 'sample1_dev' });
    expect(converter.toSecretName('API_CLIENT_SECRET')).toBe('sample1-dev-api-client-secret');
  });

  it('legacy slash-suffixed prefix — does not produce duplicated hyphens', () => {
    const converter = new AzureKeyVaultNameConverter({ prefix: 'sample1-dev/' });
    expect(converter.toSecretName('MY_DB_PASSWORD')).toBe('sample1-dev-my-db-password');
  });

  it('legacy slash-suffixed prefix prod/ — is normalized without a trailing slash', () => {
    const converter = new AzureKeyVaultNameConverter({ prefix: 'prod/' });
    expect(converter.toSecretName('MY_DB_PASSWORD')).toBe('prod-my-db-password');
    expect(converter.toSecretName('DB')).toBe('prod-db');
  });

  it('empty prefix — no hyphen is prepended', () => {
    expect(new AzureKeyVaultNameConverter({ prefix: '' }).toSecretName('MY_DB_PASSWORD')).toBe('my-db-password');
    expect(new AzureKeyVaultNameConverter({ prefix: undefined }).toSecretName('MY_DB_PASSWORD')).toBe('my-db-password');
    expect(new AzureKeyVaultNameConverter({ prefix: '___' }).toSecretName('MY_DB_PASSWORD')).toBe('my-db-password');
  });

  it('already converted name — is idempotent', () => {
    const converter = new AzureKeyVaultNameConverter();
    expect(converter.toSecretName('my-db-password')).toBe('my-db-password');
  });

  it('name without usable characters — throws', () => {
    const converter = new AzureKeyVaultNameConverter();
    expect(() => converter.toSecretName('___')).toThrow('cannot be converted');
    expect(() => converter.toSecretName('')).toThrow('cannot be converted');
  });

  it('name longer than the Key Vault limit — throws', () => {
    const converter = new AzureKeyVaultNameConverter({ prefix: 'sample1-dev' });
    expect(() => converter.toSecretName('A'.repeat(128))).toThrow('exceeds the Key Vault limit');
  });
});
