import { decryptEntry, encryptEntry, ensureKeyExists } from './local-storage-crypto';
import { LocalStorageItem, LocalStorageProtectedItem } from 'app/core/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

let tokenCache: string | null = null;
let userCache: UserSettings | null = null;

const getAndDecrypt = async (key: LocalStorageProtectedItem): Promise<string | null> => {
  const item = localStorage.getItem(key);
  return item ? decryptEntry(item) : null;
};

const setAndEncrypt = async (key: LocalStorageProtectedItem, value: string): Promise<void> => {
  const encryptedValue = await encryptEntry(value);
  localStorage.setItem(key, encryptedValue);
};

const getUser = async (): Promise<UserSettings | null> => {
  if (userCache !== null) return userCache;

  try {
    const value = await getAndDecrypt(LocalStorageProtectedItem.EncryptedUser);
    if (!value) {
      userCache = null;
    } else {
      const parsed = JSON.parse(value) as UserSettings;
      userCache = { ...parsed, createdAt: new Date(parsed.createdAt) };
    }
  } catch {
    userCache = null;
  }

  //migration from unencrypted version, remove once completed
  if (!userCache) {
    try {
      const unencryptedUser = localStorage.getItem(LocalStorageItem.NewToken);
      if (unencryptedUser) {
        const parsedUser = JSON.parse(unencryptedUser) as UserSettings;
        await setUser(parsedUser);
        localStorage.removeItem(LocalStorageItem.User);
      }
    } catch {
      userCache = null;
    }
  }

  return userCache;
};

const setUser = async (user: UserSettings): Promise<void> => {
  userCache = user;
  localStorage.setItem(LocalStorageItem.UserID, user.userId);
  await setAndEncrypt(LocalStorageProtectedItem.EncryptedUser, JSON.stringify(user));
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
  userCache = null;
  localStorage.removeItem(LocalStorageProtectedItem.EncryptedUser);
  localStorage.removeItem(LocalStorageItem.UserID);
};

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
  getUser: () => Promise<UserSettings | null>;
  setUser: (user: UserSettings) => Promise<void>;
}
