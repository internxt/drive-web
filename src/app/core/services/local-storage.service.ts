import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { Workspace } from '../types';

export const STORAGE_KEYS = {
  TUTORIAL_COMPLETED_ID: 'signUpTutorialCompleted',
  B2B_WORKSPACE: 'b2bWorkspace',
  WORKSPACE_CREDENTIALS: 'workspace_credentials',
  FOLDER_ACCESS_TOKEN: 'folderAccessToken',
  FILE_ACCESS_TOKEN: 'fileAccessToken',
};

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
  if (localStorage.getItem('theme') === 'starwars') {
    localStorage.setItem('theme', 'system');
  }

  localStorage.removeItem('xUser');
  localStorage.removeItem('xMnemonic');
  localStorage.removeItem('xToken');
  localStorage.removeItem('xNewToken');
  localStorage.removeItem('xTokenTeam');
  localStorage.removeItem('workspace');
  localStorage.removeItem('language');
  localStorage.removeItem('showSummerBanner');
  localStorage.removeItem('xInvitedToken');
  localStorage.removeItem('xResourcesToken');
  localStorage.removeItem('star_wars_theme_enabled');
  localStorage.removeItem(STORAGE_KEYS.B2B_WORKSPACE);
  localStorage.removeItem(STORAGE_KEYS.WORKSPACE_CREDENTIALS);
}

const localStorageService = {
  set,
  get,
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
