class EnvService {
  #selectedEnv;

  constructor() {
    if (process.env.NODE_ENV === 'development' && !!window.__RUNTIME_CONFIG__.REACT_APP_API_URL) {
      console.log('RUNTIME ENV EXECUTED');
      this.#selectedEnv = window.__RUNTIME_CONFIG__;
    } else {
      console.log('NORMAL ENV EXECUTED');

      this.#selectedEnv = process.env;
    }
  }

  get selectedEnv() {
    return this.#selectedEnv;
  }
}

export default new EnvService();
