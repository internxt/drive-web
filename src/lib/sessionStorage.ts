export default class SessionStorage {
  static get(key: string): string | null {
    return sessionStorage.getItem(key);
  }

  static set(key: string, value: string) {
    return sessionStorage.setItem(key, value);
  }

  static del(key: string) {
    return sessionStorage.removeItem(key);
  }

  static exists(key: string) {
    return !!sessionStorage.getItem(key);
  }

  static clear() {
    sessionStorage.removeItem('teamsStorage');
  }
}
