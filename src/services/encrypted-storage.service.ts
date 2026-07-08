import { decryptEntry, encryptEntry, ensureKeyExists } from './local-storage-crypto';
import { LocalStorageItem, LocalStorageProtectedItem } from 'app/core/types';

let tokenCache: string | null = null;

async function getAndDecrypt(key: LocalStorageProtectedItem): Promise<string | null> {
  const item = localStorage.getItem(key);
  if (item) {
    return await decryptEntry(item);
  }
  return null;
}

async function setAndEncrypt(key: LocalStorageProtectedItem, value: string): Promise<void> {
  const encryptedValue = await encryptEntry(value);
  return localStorage.setItem(key, encryptedValue);
}

async function setToken(token: string): Promise<void> {
  tokenCache = token;
  return setAndEncrypt(LocalStorageProtectedItem.EncryptedToken, token);
}

async function hydrateEncryptedStorageCache(): Promise<void> {
  await ensureKeyExists();
  const token = await getAndDecrypt(LocalStorageProtectedItem.EncryptedToken);
  tokenCache = token;

  //migration from unencrypted version, remove once completed
  if (!tokenCache) {
    const unencryptedToken = localStorage.getItem(LocalStorageItem.NewToken);
    if (unencryptedToken) {
      await setToken(unencryptedToken);
      localStorage.removeItem(LocalStorageItem.NewToken);
    }
  }
}

function getToken(): string | undefined {
  return tokenCache ?? undefined;
}

const encryptedStorageService = {
  hydrateEncryptedStorageCache,
  getToken,
  setToken,
};

export default encryptedStorageService;

export interface EncryptedStorageService {
  hydrateEncryptedStorageCache: () => Promise<void>;
  setToken: (token: string) => void;
  getToken: () => string | undefined;
}
