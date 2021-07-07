import { UserSettings, TeamsSettings } from '../models/interfaces';

function get(key: string): string | null {
  return localStorage.getItem(key);
}

function set(key: string, value: string) {
  return localStorage.setItem(key, value);
}

function getUser(): UserSettings {
  return JSON.parse(localStorage.getItem('xUser') || '{}');
}

function getTeams(): TeamsSettings {
  return JSON.parse(localStorage.getItem('xTeam') || '{}');
}

function del(key: string) {
  return localStorage.removeItem(key);
}

function exists(key: string) {
  return !!localStorage.getItem(key);
}

function clear() {
  localStorage.removeItem('xUser');
  localStorage.removeItem('xMnemonic');
  localStorage.removeItem('xToken');
  localStorage.removeItem('xTeam');
  localStorage.removeItem('xTokenTeam');
  localStorage.removeItem('limitStorage');
  sessionStorage.removeItem('limitStorage');
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