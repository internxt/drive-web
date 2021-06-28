export interface UserSettings {
  bucket: string
  createdAt: Date
  credit: number
  email: string
  lastname: string
  mnemonic: string
  name: string
  privateKey: string
  publicKey: string
  registerCompleted: boolean
  revocationKey: string
  root_folder_id: number
  userId: string
  uuid: string
}

export interface TeamsSettings {
  bucket: string
  bridge_mnemonic: string
  isAdmin: boolean
  bridge_password: string
  bridge_user: string
}

export default class Settings {
  static get(key: string): string | null {
    return localStorage.getItem(key);
  }

  static set(key: string, value: string) {
    return localStorage.setItem(key, value);
  }

  static getUser(): UserSettings {
    return JSON.parse(localStorage.getItem('xUser') || '{}');
  }

  static getTeams(): TeamsSettings {
    return JSON.parse(localStorage.getItem('xTeam') || '{}');
  }

  static del(key: string) {
    return localStorage.removeItem(key);
  }

  static exists(key: string) {
    return !!localStorage.getItem(key);
  }

  static clear() {
    localStorage.removeItem('xUser');
    localStorage.removeItem('xMnemonic');
    localStorage.removeItem('xToken');
    localStorage.removeItem('xTeam');
    localStorage.removeItem('xTokenTeam');
    localStorage.removeItem('limitStorage');
    sessionStorage.removeItem('limitStorage');
    sessionStorage.removeItem('teamsStorage');
    sessionStorage.removeItem('uploadingItems');
  }
}
