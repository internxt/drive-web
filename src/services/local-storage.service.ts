import { WorkspaceCredentialsDetails } from '@internxt/sdk/dist/workspaces';
import { LocalStorageItem } from 'app/core/types';
import { BACKUP_KEY } from './storage-keys';

function get(key: LocalStorageItem): string | null {
  return localStorage.getItem(key);
}

function set(key: LocalStorageItem, value: string): void {
  return localStorage.setItem(key, value);
}

function getBackupKeyStorageKeys() {
  const userId = localStorage.getItem(LocalStorageItem.UserID);
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

function getB2BWorkspaceMnemonic(): string | null {
  return get(LocalStorageItem.B2BworkspaceMnemonic);
}

function clearB2BWorkspace(): void {
  set(LocalStorageItem.B2BworkspaceMnemonic, '');
  set(LocalStorageItem.B2BworkspaceId, '');
}

function setB2BWorkspace(workspaceID: string, workspaceMnemonic: string): void {
  set(LocalStorageItem.B2BworkspaceId, workspaceID);
  set(LocalStorageItem.B2BworkspaceMnemonic, workspaceMnemonic);
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
  setBackupKeysAcknowledged,
  setBackupKeysSeenAt,
  removeBackupKeysSeenAt,
  getBackupKeys,
  getStorageToken,
  removeItem,
  clear,
  getB2BWorkspaceMnemonic,
  clearB2BWorkspace,
  setB2BWorkspace,
  getWorkspaceCredentials,
};

export default localStorageService;

export interface LocalStorageService {
  set: (key: LocalStorageItem, value: string) => void;
  get: (key: LocalStorageItem) => string | null;
  setBackupKeysAcknowledged: () => void;
  setBackupKeysSeenAt: (date: string) => void;
  removeBackupKeysSeenAt: () => void;
  getBackupKeys: () => {
    seenAt: string | null;
    saved: boolean;
  };
  getStorageToken: (isFolder: boolean) => string | null;
  getB2BWorkspaceMnemonic: () => string | null;
  clearB2BWorkspace: () => void;
  setB2BWorkspace: (workspaceID: string, workspaceMnemonic: string) => void;
  removeItem: (key: LocalStorageItem) => void;
  clear: () => void;
}
