import { decryptEntry, encryptEntry, ensureKeyExists } from './local-storage-crypto';
import { LocalStorageItem, LocalStorageProtectedItem } from 'app/core/types';

let tokenCache: string | null = null;
let folderTokenCache: string | null = null;
let fileTokenCache: string | null = null;

const getAndDecrypt = async (key: LocalStorageProtectedItem): Promise<string | null> => {
  const item = localStorage.getItem(key);
  return item ? decryptEntry(item) : null;
};

const setAndEncrypt = async (key: LocalStorageProtectedItem, value: string): Promise<void> => {
  if (!value) return;
  const encryptedValue = await encryptEntry(value);
  localStorage.setItem(key, encryptedValue);
};

const setToken = async (token: string): Promise<void> => {
  tokenCache = token || null;
  return setAndEncrypt(LocalStorageProtectedItem.EncryptedToken, token);
};

const getSharedItemAccessToken = async (isFolder: boolean): Promise<string | undefined> => {
  const key = isFolder ? LocalStorageProtectedItem.EncryptedFolderToken : LocalStorageProtectedItem.EncryptedFileToken;
  const cache = isFolder ? folderTokenCache : fileTokenCache;
  if (cache !== null) return cache;

  let value: string | null;
  try {
    value = await getAndDecrypt(key);
  } catch {
    value = null;
  }
  if (isFolder) folderTokenCache = value;
  else fileTokenCache = value;
  return value ?? undefined;
};

const setFolderToken = async (token: string): Promise<void> => {
  folderTokenCache = token || null;
  return setAndEncrypt(LocalStorageProtectedItem.EncryptedFolderToken, token);
};

const setFileToken = async (token: string): Promise<void> => {
  fileTokenCache = token || null;
  return setAndEncrypt(LocalStorageProtectedItem.EncryptedFileToken, token);
};

const clearFolderToken = (): void => {
  folderTokenCache = null;
  localStorage.removeItem(LocalStorageProtectedItem.EncryptedFolderToken);
};

const clearFileToken = (): void => {
  fileTokenCache = null;
  localStorage.removeItem(LocalStorageProtectedItem.EncryptedFileToken);
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
  folderTokenCache = null;
  fileTokenCache = null;
  localStorage.removeItem(LocalStorageProtectedItem.EncryptedToken);
  localStorage.removeItem(LocalStorageProtectedItem.EncryptedFolderToken);
  localStorage.removeItem(LocalStorageProtectedItem.EncryptedFileToken);
};

const encryptedStorageService = {
  hydrateEncryptedStorageCache,
  getToken,
  setToken,
  getSharedItemAccessToken,
  setFileToken,
  setFolderToken,
  clearFileToken,
  clearFolderToken,
  clear,
};

export default encryptedStorageService;

export interface EncryptedStorageService {
  hydrateEncryptedStorageCache: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
  getToken: () => string | undefined;
  getSharedItemAccessToken: (isFolder: boolean) => Promise<string | undefined>;
  setFileToken: (token: string) => Promise<void>;
  setFolderToken: (token: string) => Promise<void>;
  clearFileToken: () => void;
  clearFolderToken: () => void;
  clear: () => void;
}
