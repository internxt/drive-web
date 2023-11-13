import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { TeamsSettings } from '../../teams/types';
import { Workspace } from '../types';

export const STORAGE_KEYS = {
  SIGN_UP_TUTORIAL_COMPLETED: 'signUpTutorialCompleted',
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

function getTeams(): TeamsSettings | null {
  const stringTeam: string | null = localStorage.getItem('xTeam');

  return stringTeam ? JSON.parse(stringTeam) : null;
}

function getWorkspace(): string {
  return localStorage.getItem('workspace') || Workspace.Individuals;
}

function removeItem(key: string): void {
  localStorage.removeItem(key);
}

function exists(key: string): boolean {
  return !!localStorage.getItem(key);
}

function getIsSignUpTutorialCompleted(): boolean {
  return localStorage.getItem(STORAGE_KEYS.SIGN_UP_TUTORIAL_COMPLETED) === 'true';
}

function clear(): void {
  localStorage.removeItem('xUser');
  localStorage.removeItem('xMnemonic');
  localStorage.removeItem('xToken');
  localStorage.removeItem('xNewToken');
  localStorage.removeItem('xTeam');
  localStorage.removeItem('xTokenTeam');
  localStorage.removeItem('workspace');
  localStorage.removeItem('language');
  localStorage.removeItem(STORAGE_KEYS.SIGN_UP_TUTORIAL_COMPLETED);
  localStorage.removeItem('showSummerBanner');
  localStorage.removeItem('xInvitedToken');
  localStorage.removeItem('xResourcesToken');
}

const localStorageService = {
  set,
  get,
  getUser,
  getTeams,
  getWorkspace,
  getIsSignUpTutorialCompleted,
  removeItem,
  exists,
  clear,
};

export default localStorageService;

export interface LocalStorageService {
  set: (key: string, value: string) => void;
  get: (key: string) => string | null;
  getUser: () => UserSettings | null;
  getTeams: () => TeamsSettings | null;
  getWorkspace: () => string;
  removeItem: (key: string) => void;
  exists: (key: string) => boolean;
  clear: () => void;
}
