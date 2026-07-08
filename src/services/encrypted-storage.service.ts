import { decryptEntry, encryptEntry, ensureKeyExists } from './local-storage-crypto';
import { LocalStorageItem, LocalStorageProtectedItem } from 'app/core/types';

let tokenCache: string | null = null;

async function getAndDecrypt(key: LocalStorageProtectedItem): Promise<string | null> {
  const item = localStorage.getItem(key);
  return item ? decryptEntry(item) : null;
}

async function setAndEncrypt(key: LocalStorageProtectedItem, value: string): Promise<void> {
  const encryptedValue = await encryptEntry(value);
  localStorage.setItem(key, encryptedValue);
}

async function setToken(token: string): Promise<void> {
  tokenCache = token;
  return setAndEncrypt(LocalStorageProtectedItem.EncryptedToken, token);
}

async function hydrateEncryptedStorageCache(): Promise<void> {
  await ensureKeyExists();
  tokenCache = await getAndDecrypt(LocalStorageProtectedItem.EncryptedToken);

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
  setToken: (token: string) => Promise<void>;
  getToken: () => string | undefined;
}
