import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { LocalStorageItem, Workspace } from 'app/core/types';
import { STORAGE_KEYS } from './storage-keys';

function get(key: string): string | null {
  return localStorage.getItem(key);
}

function set(key: string, value: string): void {
  return localStorage.setItem(key, value);
}

function getBackupKeyStorageKeys() {
  const user = getUser();
  const userId = user?.uuid;
  return {
    remindLaterAt: `${STORAGE_KEYS.BACKUP_KEY.REMIND_LATER_AT}_${userId}`,
    acknowledgedAt: `${STORAGE_KEYS.BACKUP_KEY.ACKNOWLEDGED_AT}_${userId}`,
  };
}

function setBackupKeysAcknowledged(): void {
  const { acknowledgedAt } = getBackupKeyStorageKeys();
  localStorage.setItem(acknowledgedAt, 'true');
}

function setBackupKeysRemindLater(date: string): void {
  const { remindLaterAt } = getBackupKeyStorageKeys();
  localStorage.setItem(remindLaterAt, date);
}

function getBackupKeys(): {
  remindMeLater: string | null;
  saved: boolean;
} {
  const { remindLaterAt, acknowledgedAt } = getBackupKeyStorageKeys();
  const isAcknowledged = localStorage.getItem(acknowledgedAt) === 'true';
  return {
    remindMeLater: localStorage.getItem(remindLaterAt),
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

function removeItem(key: string): void {
  localStorage.removeItem(key);
}

function exists(key: string): boolean {
  return !!localStorage.getItem(key);
}

function hasCompletedTutorial(id?: string): boolean {
  return localStorage.getItem(STORAGE_KEYS.TUTORIAL_COMPLETED_ID) === id;
}

function clear(): void {
  localStorage.setItem('theme', 'system');

  localStorage.removeItem(getBackupKeyStorageKeys().remindLaterAt);
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
  setBackupKeysRemindLater,
  getBackupKeys,
  getUser,
  getWorkspace,
  hasCompletedTutorial,
  removeItem,
  exists,
  clear,
  getB2BWorkspace,
  getWorkspaceCredentials,
};

export default localStorageService;

export interface LocalStorageService {
  set: (key: string, value: string) => void;
  get: (key: string) => string | null;
  setBackupKeysAcknowledged: () => void;
  setBackupKeysRemindLater: (date: string) => void;
  getBackupKeys: () => {
    remindMeLater: string | null;
    saved: boolean;
  };
  getUser: () => UserSettings | null;
  getWorkspace: () => string;
  removeItem: (key: string) => void;
  exists: (key: string) => boolean;
  clear: () => void;
}
