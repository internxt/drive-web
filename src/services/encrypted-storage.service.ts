import { decryptEntry, encryptEntry, ensureKeyExists } from './local-storage-crypto';
import { LocalStorageItem, LocalStorageProtectedItem } from 'app/core/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

let tokenCache: string | null = null;

const getAndDecrypt = async (key: LocalStorageProtectedItem): Promise<string | null> => {
  const item = localStorage.getItem(key);
  return item ? decryptEntry(item) : null;
};

const setAndEncrypt = async (key: LocalStorageProtectedItem, value: string): Promise<void> => {
  const encryptedValue = await encryptEntry(value);
  localStorage.setItem(key, encryptedValue);
};

const setToken = async (token: string): Promise<void> => {
  tokenCache = token;
  return setAndEncrypt(LocalStorageProtectedItem.EncryptedToken, token);
};

const hydrateEncryptedStorageCache = async (): Promise<void> => {
  await ensureKeyExists();
  try {
    tokenCache = await getAndDecrypt(LocalStorageProtectedItem.EncryptedToken);
  } catch {
    tokenCache = null;
  }

  //migration from unencrypted version, remove once completed
  if (!tokenCache) {
    const unencryptedToken = localStorage.getItem(LocalStorageItem.NewToken);
    if (unencryptedToken) {
      await setToken(unencryptedToken);
      localStorage.removeItem(LocalStorageItem.NewToken);
    }
  }
};

const getToken = (): string | undefined => tokenCache ?? undefined;

const clear = (): void => {
  tokenCache = null;
  localStorage.removeItem(LocalStorageProtectedItem.EncryptedToken);
  localStorage.removeItem(LocalStorageProtectedItem.User);
  localStorage.removeItem(LocalStorageItem.UserID);
};

function getUser(): UserSettings | null {
  const stringUser: string | null = localStorage.getItem(LocalStorageProtectedItem.User);

  return stringUser ? JSON.parse(stringUser) : null;
}

function setUser(user: UserSettings): void {
  localStorage.setItem(LocalStorageItem.UserID, user.userId);
  localStorage.setItem(LocalStorageProtectedItem.User, JSON.stringify(user));
}

const encryptedStorageService = {
  hydrateEncryptedStorageCache,
  getToken,
  setToken,
  clear,
  getUser,
  setUser,
};

export default encryptedStorageService;

export interface EncryptedStorageService {
  hydrateEncryptedStorageCache: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
  getToken: () => string | undefined;
  clear: () => void;
  getUser: () => UserSettings | null;
  setUser: (user: UserSettings) => void;
}
