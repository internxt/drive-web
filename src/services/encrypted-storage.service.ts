import { decryptEntry, encryptEntry, ensureKeyExists } from './local-storage-crypto';
import { LocalStorageItem, LocalStorageProtectedItem } from 'app/core/types';

let tokenCache: string | null = null;
let workspaceMnemonicCache: string | null = null;

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
  clearB2BWorkspace();
};

async function getB2BWorkspaceMnemonic(): Promise<string | null> {
  if (workspaceMnemonicCache !== null) return workspaceMnemonicCache;

  let value: string | null;
  try {
    value = await getAndDecrypt(LocalStorageProtectedItem.EncryptedB2BworkspaceMnemonic);
  } catch {
    value = null;
  }

  workspaceMnemonicCache = value;
  return value;
}

function clearB2BWorkspace(): void {
  workspaceMnemonicCache = null;
  localStorage.removeItem(LocalStorageProtectedItem.EncryptedB2BworkspaceMnemonic);
  localStorage.removeItem(LocalStorageItem.B2BworkspaceId);
}

async function setB2BWorkspace(workspaceID: string, workspaceMnemonic: string): Promise<void> {
  workspaceMnemonicCache = workspaceMnemonic || null;
  localStorage.setItem(LocalStorageItem.B2BworkspaceId, workspaceID);
  await setAndEncrypt(LocalStorageProtectedItem.EncryptedB2BworkspaceMnemonic, workspaceMnemonic);
}

const encryptedStorageService = {
  hydrateEncryptedStorageCache,
  getToken,
  setToken,
  clear,
  getB2BWorkspaceMnemonic,
  clearB2BWorkspace,
  setB2BWorkspace,
};

export default encryptedStorageService;

export interface EncryptedStorageService {
  hydrateEncryptedStorageCache: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
  getToken: () => string | undefined;
  clear: () => void;
  setB2BWorkspace: (workspaceID: string, workspaceMnemonic: string) => Promise<void>;
  getB2BWorkspaceMnemonic: () => Promise<string | null>;
  clearB2BWorkspace: () => void;
}
