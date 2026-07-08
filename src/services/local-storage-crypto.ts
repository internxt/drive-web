import {
  FailedToEncryptEntry,
  FailedToDecryptEntry,
  FailedToCreateKey,
  FailedToFindKey,
  KeyAlreadyExistsError,
} from './local-storage-errors';
import { KEY_ID, KEY_LENGTH, IV_LENGTH, ALGORITHM } from './local-storage-constants';
import databaseService, { DatabaseCollection } from 'app/database/services/database.service';

async function ensureKey(): Promise<CryptoKey> {
  const existing = await getKey();
  if (existing) return existing;
  else return createNewKey();
}

export async function ensureKeyExists(): Promise<void> {
  await ensureKey();
}

async function getKey(): Promise<CryptoKey | undefined> {
  return databaseService.get(DatabaseCollection.CryptoKeys, KEY_ID);
}

export function deleteDb(): Promise<void> {
  return databaseService.delete(DatabaseCollection.CryptoKeys, KEY_ID);
}

export async function createNewKey(): Promise<CryptoKey> {
  const existing = await getKey();
  if (existing) {
    throw new KeyAlreadyExistsError('A key already exists; clear storage before creating a new one');
  }
  try {
    const key = await crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']);
    await databaseService.put(DatabaseCollection.CryptoKeys, KEY_ID, key);
    return key;
  } catch (error) {
    throw new FailedToCreateKey(error instanceof Error ? error.message : String(error));
  }
}

export async function encryptEntry(plaintext: string): Promise<string> {
  const key = await getKey();
  if (!key) {
    throw new FailedToFindKey('No encryption key found');
  }
  try {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoded = new TextEncoder().encode(plaintext);
    const buf = new Uint8Array(await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded));

    const result = new Uint8Array(iv.length + buf.length);
    result.set(iv, 0);
    result.set(buf, iv.length);
    return result.toBase64();
  } catch (error) {
    throw new FailedToEncryptEntry(error instanceof Error ? error.message : String(error));
  }
}

export async function decryptEntry(ciphertextBase64: string): Promise<string> {
  const key = await getKey();
  if (!key) {
    throw new FailedToFindKey('No encryption key found');
  }

  try {
    const input = Uint8Array.fromBase64(ciphertextBase64);

    const iv = input.slice(0, IV_LENGTH);
    const data = input.slice(IV_LENGTH);
    const buf = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data);
    return new TextDecoder().decode(buf);
  } catch (error) {
    throw new FailedToDecryptEntry(error instanceof Error ? error.message : String(error));
  }
}
