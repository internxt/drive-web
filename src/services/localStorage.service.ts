import { UserSettings, TeamsSettings } from '../models/interfaces';

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

function getTeams(): TeamsSettings {
  return JSON.parse(localStorage.getItem('xTeam') || '{}');
}

function del(key: string): void {
  localStorage.removeItem(key);
}

function exists(key: string): boolean {
  return !!localStorage.getItem(key);
}

function clear(): void {
  localStorage.removeItem('xUser');
  localStorage.removeItem('xMnemonic');
  localStorage.removeItem('xToken');
  localStorage.removeItem('xTeam');
  localStorage.removeItem('xTokenTeam');
  localStorage.removeItem('limitStorage');
  sessionStorage.removeItem('teamsStorage');
}

const localStorageService = {
  set,
  get,
  getUser,
  getTeams,
  del,
  exists,
  clear
};

export default localStorageService;