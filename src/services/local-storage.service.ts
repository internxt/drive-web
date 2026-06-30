import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { LocalStorageItem, Workspace } from 'app/core/types';
import { STORAGE_KEYS } from './storage-keys';

function get(key: LocalStorageItem ): string | null {
  return localStorage.getItem(key);
}

function set(key: LocalStorageItem, value: string): void {
  return localStorage.setItem(key, value);
}

function getBackupKeyStorageKeys() {
  const user = getUser();
  const userId = user?.uuid;
  return {
    seenAt: `${STORAGE_KEYS.BACKUP_KEY.SEEN_AT}_${userId}`,
    acknowledgedAt: `${STORAGE_KEYS.BACKUP_KEY.ACKNOWLEDGED_AT}_${userId}`,
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

function getUser(): UserSettings | null {
  const stringUser: string | null = localStorage.getItem(LocalStorageItem.User);

  return stringUser ? JSON.parse(stringUser) : null;
}

function getWorkspace(): string {
  return localStorage.getItem('workspace') ?? Workspace.Individuals;
}

function getB2BWorkspace(): WorkspaceData | null {
  const b2bWorkspace = localStorage.getItem(STORAGE_KEYS.B2B_WORKSPACE);
  if (b2bWorkspace === 'null') return null;

  if (b2bWorkspace) return JSON.parse(b2bWorkspace);

  return null;
}

function getWorkspaceCredentials(): WorkspaceCredentialsDetails | null {
  const workspaceCredentials = localStorage.getItem(STORAGE_KEYS.WORKSPACE_CREDENTIALS);
  if (workspaceCredentials === 'null') return null;

  if (workspaceCredentials) return JSON.parse(workspaceCredentials);

  return null;
}

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS] extends infer V
  ? V extends string
    ? V
    : V[keyof V]
  : never;

export function getStorageItem(key: StorageKey): string | null {
  return localStorage.getItem(key);
}

export function setStorageItem(key: StorageKey, value: string): void {
  return localStorage.setItem(key, value);
}

function getStorageToken(isFolder: boolean): string | null {
   const key = isFolder ? STORAGE_KEYS.FOLDER_ACCESS_TOKEN : STORAGE_KEYS.FILE_ACCESS_TOKEN;
   return localStorage.getStorageItem(key);
}

function removeItem(key: string): void {
  localStorage.removeItem(key);}


function clear(): void {
  localStorage.setItem('theme', 'system');

  localStorage.removeItem(getBackupKeyStorageKeys().seenAt);
  Object.values(STORAGE_KEYS.THEMES).forEach((key) => localStorage.removeItem(key));
  Object.values(LocalStorageItem).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('theme:isDark');
  localStorage.removeItem(STORAGE_KEYS.B2B_WORKSPACE);
  localStorage.removeItem(STORAGE_KEYS.WORKSPACE_CREDENTIALS);
  localStorage.removeItem(STORAGE_KEYS.GCLID);
}

const localStorageService = {
  set,
  get,
  setBackupKeysAcknowledged,
  setBackupKeysSeenAt,
  removeBackupKeysSeenAt,
  getBackupKeys,
  getUser,
  getWorkspace,
  getStorageToken,
  getStorageItem,
  setStorageItem,
  removeItem,
  clear,
  getB2BWorkspace,
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
  getB2BWorkspace: () => WorkspaceData | null;
  getUser: () => UserSettings | null;
  getStorageItem: (key: StorageKey) => string | null;
  setStorageItem: (key: StorageKey, value: string) => void;
  getWorkspace: () => string;
  removeItem: (key: string) => void;
  clear: () => void;
}
