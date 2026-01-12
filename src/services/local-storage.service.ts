import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { Workspace } from 'app/core/types';
import { STORAGE_KEYS } from './storage-keys';

function get(key: string): string | null {
  return localStorage.getItem(key);
}

function set(key: string, value: string): void {
  return localStorage.setItem(key, value);
}

function getUser(): UserSettings | null {
  const stringUser: string | null = localStorage.getItem('xUser');

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

  Object.values(STORAGE_KEYS.THEMES).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('xUser');
  localStorage.removeItem('xMnemonic');
  localStorage.removeItem('xToken');
  localStorage.removeItem('xNewToken');
  localStorage.removeItem('xTokenTeam');
  localStorage.removeItem('workspace');
  localStorage.removeItem('language');
  localStorage.removeItem('showSummerBanner');
  localStorage.removeItem('theme:isDark');
  localStorage.removeItem('xInvitedToken');
  localStorage.removeItem('xResourcesToken');
  localStorage.removeItem('sessionKey');
  localStorage.removeItem('sessionKeySalt');
  localStorage.removeItem(STORAGE_KEYS.B2B_WORKSPACE);
  localStorage.removeItem(STORAGE_KEYS.WORKSPACE_CREDENTIALS);
  localStorage.removeItem(STORAGE_KEYS.GCLID);
}

function getSessionKey(): string | null {
  return localStorage.getItem('sessionKey');
}

function getSessionKeySalt(): string | null {
  return localStorage.getItem('sessionKeySalt');
}

function setSessionKey(sessionKey: string, salt: string): void {
  localStorage.setItem('sessionKey', sessionKey);
  localStorage.setItem('sessionKeySalt', salt);
}

const localStorageService = {
  set,
  get,
  getSessionKey,
  getSessionKeySalt,
  setSessionKey,
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
  getUser: () => UserSettings | null;
  getWorkspace: () => string;
  removeItem: (key: string) => void;
  exists: (key: string) => boolean;
  clear: () => void;
}
