import { decryptEntry, encryptEntry, ensureKeyExists } from './local-storage-crypto';
import { LocalStorageItem, LocalStorageProtectedItem } from 'app/core/types';
import { WorkspaceCredentialsDetails } from '@internxt/sdk/dist/workspaces';

let tokenCache: string | null = null;
let workspaceMnemonicCache: string | null = null;
let workspaceCredentialsCache: WorkspaceCredentialsDetails | null = null;

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

  try {
    const value = await getAndDecrypt(LocalStorageProtectedItem.EncryptedWorkspaceCredentials);
    workspaceCredentialsCache = value ? (JSON.parse(value) as WorkspaceCredentialsDetails) : null;
  } catch {
    workspaceCredentialsCache = null;
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

const getB2BWorkspaceMnemonic = async (): Promise<string | null> => {
  if (workspaceMnemonicCache !== null) return workspaceMnemonicCache;

  let value: string | null;
  try {
    value = await getAndDecrypt(LocalStorageProtectedItem.EncryptedB2BworkspaceMnemonic);
  } catch {
    value = null;
  }

  workspaceMnemonicCache = value;
  return value;
};

const clearB2BWorkspace = (): void => {
  workspaceMnemonicCache = null;
  localStorage.removeItem(LocalStorageProtectedItem.EncryptedB2BworkspaceMnemonic);
  localStorage.removeItem(LocalStorageItem.B2BworkspaceId);
};

const setB2BWorkspace = async (workspaceID: string, workspaceMnemonic: string): Promise<void> => {
  workspaceMnemonicCache = workspaceMnemonic || null;
  localStorage.setItem(LocalStorageItem.B2BworkspaceId, workspaceID);
  await setAndEncrypt(LocalStorageProtectedItem.EncryptedB2BworkspaceMnemonic, workspaceMnemonic);
};

const getWorkspaceCredentials = (): WorkspaceCredentialsDetails | null => workspaceCredentialsCache ?? null;

const setWorkspaceCredentials = async (credentials: WorkspaceCredentialsDetails): Promise<void> => {
  workspaceCredentialsCache = credentials;
  await setAndEncrypt(LocalStorageProtectedItem.EncryptedWorkspaceCredentials, JSON.stringify(credentials));
};

const clearWorkspaceCredentials = (): void => {
  workspaceCredentialsCache = null;
  localStorage.removeItem(LocalStorageProtectedItem.EncryptedWorkspaceCredentials);
};

const encryptedStorageService = {
  hydrateEncryptedStorageCache,
  getToken,
  setToken,
  clear,
  getB2BWorkspaceMnemonic,
  setB2BWorkspace,
  clearB2BWorkspace,
  getWorkspaceCredentials,
  setWorkspaceCredentials,
  clearWorkspaceCredentials,
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
  getWorkspaceCredentials: () => WorkspaceCredentialsDetails | null;
  setWorkspaceCredentials: (credentials: WorkspaceCredentialsDetails) => Promise<void>;
  clearWorkspaceCredentials: () => void;
}
