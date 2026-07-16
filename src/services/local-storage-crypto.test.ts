import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createNewKey, encryptEntry, decryptEntry, deleteDb } from './local-storage-crypto';
import {
  FailedToDecryptEntry,
  KeyAlreadyExistsError,
  FailedToFindKey,
  FailedToCreateKey,
  FailedToEncryptEntry,
} from './local-storage-errors';
import { KEY_LENGTH, ALGORITHM, IV_LENGTH } from './local-storage-constants';

beforeEach(async () => {
  await deleteDb();
  vi.clearAllMocks();
  vi.resetAllMocks();
});

describe('createNewKey', () => {
  it('creates a non-extractable AES-GCM 256 key', async () => {
    const key = await createNewKey();

    expect(key.type).toBe('secret');
    expect(key.extractable).toBe(false);
    expect(key.algorithm.name).toBe(ALGORITHM);
    expect(key.algorithm as AesKeyAlgorithm).toHaveLength(KEY_LENGTH);
    expect(key.usages).toEqual(expect.arrayContaining(['encrypt', 'decrypt']));
  });

  it('throws KeyAlreadyExistsError on a second call without clearing storage first', async () => {
    await createNewKey();

    await expect(createNewKey()).rejects.toThrow(KeyAlreadyExistsError);
  });

  it('allows creating a new key after deleteDb clears storage', async () => {
    await createNewKey();
    await deleteDb();

    await expect(createNewKey()).resolves.toBeInstanceOf(CryptoKey);
  });

  it('does not overwrite the existing key on a rejected second call', async () => {
    await createNewKey();
    const text = 'test value';
    const ciphertext = await encryptEntry(text);
    await expect(createNewKey()).rejects.toThrow(KeyAlreadyExistsError);
    const decrypted = await decryptEntry(ciphertext);
    expect(decrypted).toBe(text);
  });

  it('throws FailedToCreateKey if key generation fails', async () => {
    vi.spyOn(window.crypto.subtle, 'generateKey').mockImplementationOnce(() => {
      throw new Error('Simulated key generation failure');
    });
    await expect(createNewKey()).rejects.toThrow(FailedToCreateKey);
  });
});

describe('encryptEntry', () => {
  const mockMnemonic = 'test mnemonic';
  it('throws FailedToFindKey when no key exists yet', async () => {
    await expect(decryptEntry(mockMnemonic)).rejects.toThrow(FailedToFindKey);
  });

  it('throws FailedToEncryptEntry if encryption fails', async () => {
    await createNewKey();
    vi.spyOn(window.crypto.subtle, 'encrypt').mockImplementationOnce(() => {
      throw new Error('Simulated encryption failure');
    });
    await expect(encryptEntry(mockMnemonic)).rejects.toThrow(FailedToEncryptEntry);
  });

  it('returns a base64 string containing IV + ciphertext when a key exists', async () => {
    await createNewKey();

    const result = await encryptEntry(mockMnemonic);

    expect(typeof result).toBe('string');
    const decodedLength = Uint8Array.fromBase64(result).length;
    expect(decodedLength).toBeGreaterThan(IV_LENGTH);
  });

  it('produces different ciphertext for the same plaintext on each call', async () => {
    await createNewKey();

    const first = await encryptEntry(mockMnemonic);
    const second = await encryptEntry(mockMnemonic);

    expect(first).not.toBe(second);
  });
});

describe('decryptEntry', () => {
  const mockMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  it('throws FailedToFindKey when no key exists yet', async () => {
    await expect(decryptEntry('irrelevant-base64==')).rejects.toThrow(FailedToFindKey);
  });

  it('decryption works', async () => {
    await createNewKey();

    const ciphertext = await encryptEntry(mockMnemonic);
    const decrypted = await decryptEntry(ciphertext);

    expect(decrypted).toBe(mockMnemonic);
  });
  it('handles unicode string correctly', async () => {
    await createNewKey();
    const stringWithUnicode = '🔐 ñññññññ café';

    const ciphertext = await encryptEntry(stringWithUnicode);
    const decrypted = await decryptEntry(ciphertext);

    expect(decrypted).toBe(stringWithUnicode);
  });

  it('throws FailedToDecryptEntry when ciphertext has been tampered with', async () => {
    await createNewKey();
    const ciphertext = await encryptEntry(mockMnemonic);

    const bytes = Uint8Array.fromBase64(ciphertext);
    bytes[bytes.length - 1] ^= 0xff;
    const tampered = bytes.toBase64();

    await expect(decryptEntry(tampered)).rejects.toThrow(FailedToDecryptEntry);
  });

  it('throws FailedToDecryptEntry on malformed input', async () => {
    await createNewKey();

    await expect(decryptEntry('not-valid-base64-!!!')).rejects.toThrow(FailedToDecryptEntry);
  });

  it('throws FailedToDecryptEntry when decrypting with the wrong key', async () => {
    await createNewKey();
    const ciphertext = await encryptEntry(mockMnemonic);

    await deleteDb();
    await createNewKey();

    await expect(decryptEntry(ciphertext)).rejects.toThrow(FailedToDecryptEntry);
  });
});
