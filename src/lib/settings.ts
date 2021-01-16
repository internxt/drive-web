export default class Settings {
  static get(key: string): string | null {
    return localStorage.getItem(key);
  }

  static set(key: string, value: string) {
    return localStorage.setItem('key', value);
  }

  static getUser() {
    return JSON.parse(localStorage.getItem('xUser') || '{}');
  }

  static clear() {
    localStorage.removeItem('xUser');
    localStorage.removeItem('xMnemonic');
    localStorage.removeItem('xToken');
  }
}
