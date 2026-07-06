import {
  FailedToEncryptEntry,
  FailedToDecryptEntry,
  FailedToCreateKey,
  FailedToFindKey,
  KeyAlreadyExistsError,
} from './local-storage-errors';
import { DB_NAME, DB_VERSION, STORE, KEY_ID, KEY_LENGTH, IV_LENGTH, ALGORITHM } from './local-storage-constants';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getKey(): Promise<CryptoKey | undefined> {
  const db = await openDb();
  try {
    const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(KEY_ID);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });

    return existing;
  } catch (error) {
    throw new FailedToFindKey(error instanceof Error ? error.message : String(error));
  } finally {
    db.close();
  }
}

export function deleteDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('deleteDatabase blocked by an open connection'));
  });
}

export async function createNewKey(): Promise<CryptoKey> {
  const existing = await getKey();
  if (existing) {
    throw new KeyAlreadyExistsError('A key already exists; clear storage before creating a new one');
  }

  const db = await openDb();
  try {
    const key = await crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(key, KEY_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return key;
  } catch (error) {
    throw new FailedToCreateKey(error instanceof Error ? error.message : String(error));
  } finally {
    db.close();
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
