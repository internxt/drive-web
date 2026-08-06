import { decryptEntry, encryptEntry, ensureKeyExists } from './local-storage-crypto';
import { LocalStorageItem, LocalStorageProtectedItem } from 'app/core/types';
import { WorkspaceCredentialsDetails } from '@internxt/sdk/dist/workspaces';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

let tokenCache: string | null = null;
let workspaceMnemonicCache: string | null = null;
let workspaceCredentialsCache: WorkspaceCredentialsDetails | null = null;
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
  clearFileToken();
  clearFolderToken();
  clearB2BWorkspace();
  clearWorkspaceCredentials();
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

const getUser = (): UserSettings | null => {
  const stringUser: string | null = localStorage.getItem(LocalStorageProtectedItem.User);

  return stringUser ? JSON.parse(stringUser) : null;
};

const setUser = (user: UserSettings): void => {
  localStorage.setItem(LocalStorageItem.UserUUID, user.uuid);
  localStorage.setItem(LocalStorageProtectedItem.User, JSON.stringify(user));
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
  getB2BWorkspaceMnemonic,
  setB2BWorkspace,
  clearB2BWorkspace,
  getWorkspaceCredentials,
  setWorkspaceCredentials,
  clearWorkspaceCredentials,
  getUser,
  setUser,
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
  setB2BWorkspace: (workspaceID: string, workspaceMnemonic: string) => Promise<void>;
  getB2BWorkspaceMnemonic: () => Promise<string | null>;
  clearB2BWorkspace: () => void;
  getWorkspaceCredentials: () => WorkspaceCredentialsDetails | null;
  setWorkspaceCredentials: (credentials: WorkspaceCredentialsDetails) => Promise<void>;
  clearWorkspaceCredentials: () => void;
  getUser: () => UserSettings | null;
  setUser: (user: UserSettings) => void;
}
