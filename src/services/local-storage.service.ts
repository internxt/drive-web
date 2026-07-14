import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { LocalStorageItem, LocalStorageProtectedItem } from 'app/core/types';
import { BACKUP_KEY } from './storage-keys';
import { decryptEntry, encryptEntry } from './local-storage-crypto';

function get(key: LocalStorageItem): string | null {
  return localStorage.getItem(key);
}

function set(key: LocalStorageItem, value: string): void {
  return localStorage.setItem(key, value);
}

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

function getBackupKeyStorageKeys() {
  const user = getUser();
  const userId = user?.uuid;
  return {
    seenAt: `${BACKUP_KEY.SEEN_AT}_${userId}`,
    acknowledgedAt: `${BACKUP_KEY.ACKNOWLEDGED_AT}_${userId}`,
  };
}

function setBackupKeysAcknowledged(): void {
  const { acknowledgedAt } = getBackupKeyStorageKeys();
  localStorage.setItem(acknowledgedAt, 'true');
}

function setBackupKeysSeenAt(date: string): void {
  const { seenAt } = getBackupKeyStorageKeys();
  localStorage.setItem(seenAt, date);
}

function setToken(token: string): void {
  return set(LocalStorageItem.NewToken, token);
}

function removeBackupKeysSeenAt(): void {
  const { seenAt } = getBackupKeyStorageKeys();
  localStorage.removeItem(seenAt);
}

function getBackupKeys(): {
  seenAt: string | null;
  saved: boolean;
} {
  const { seenAt, acknowledgedAt } = getBackupKeyStorageKeys();
  const isAcknowledged = localStorage.getItem(acknowledgedAt) === 'true';
  return {
    seenAt: localStorage.getItem(seenAt),
    saved: isAcknowledged,
  };
}

function getUser(): UserSettings | null {
  const stringUser: string | null = get(LocalStorageItem.User);

  return stringUser ? JSON.parse(stringUser) : null;
}

function setUser(user: UserSettings): void {
  set(LocalStorageItem.User, JSON.stringify(user));
}

function getToken(): string | null {
  return get(LocalStorageItem.NewToken);
}

function getB2BWorkspace(): WorkspaceData | null {
  const b2bWorkspace = get(LocalStorageItem.B2Bworkspace);
  if (b2bWorkspace === 'null') return null;

  if (b2bWorkspace) return JSON.parse(b2bWorkspace);

  return null;
}

function getWorkspaceCredentials(): WorkspaceCredentialsDetails | null {
  const workspaceCredentials = get(LocalStorageItem.WorkspaceCredentials);
  if (workspaceCredentials) return JSON.parse(workspaceCredentials);

  return null;
}

function getStorageToken(isFolder: boolean): string | null {
  const key = isFolder ? LocalStorageItem.FolderAccessToken : LocalStorageItem.FileAccessToken;
  return get(key);
}

function removeItem(key: LocalStorageItem): void {
  localStorage.removeItem(key);
}

function clear(): void {
  localStorage.clear();
}

const localStorageService = {
  set,
  get,
  setAndEncrypt,
  getAndDecrypt,
  setBackupKeysAcknowledged,
  setBackupKeysSeenAt,
  setToken,
  removeBackupKeysSeenAt,
  getBackupKeys,
  getUser,
  setUser,
  getToken,
  getStorageToken,
  removeItem,
  clear,
  getB2BWorkspace,
  getWorkspaceCredentials,
};

export default localStorageService;

export interface LocalStorageService {
  set: (key: LocalStorageItem, value: string) => void;
  get: (key: LocalStorageItem) => string | null;
  getAndDecrypt: (key: LocalStorageProtectedItem) => Promise<string | null>;
  setAndEncrypt: (key: LocalStorageProtectedItem, value: string) => Promise<void>;
  setBackupKeysAcknowledged: () => void;
  setBackupKeysSeenAt: (date: string) => void;
  setToken: (token: string) => void;
  removeBackupKeysSeenAt: () => void;
  getBackupKeys: () => {
    seenAt: string | null;
    saved: boolean;
  };
  getStorageToken: (isFolder: boolean) => string | null;
  getB2BWorkspace: () => WorkspaceData | null;
  getUser: () => UserSettings | null;
  setUser: (user: UserSettings) => void;
  getToken: () => string | null;
  removeItem: (key: LocalStorageItem) => void;
  clear: () => void;
}
