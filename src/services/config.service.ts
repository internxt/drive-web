import APP_CONFIG from '../config/app.json';
import { AppConfig, AppViewConfig } from '../models/interfaces';

export function getAppConfig(): AppConfig {
  return APP_CONFIG;
}

export function getViewConfig(filter: any): AppViewConfig | undefined {
  return APP_CONFIG.views.find(v => Object.keys(filter).reduce((t: boolean, key: string) => {
    return v[key] === filter[key] && t;
  }, true)
  );
}

const configService = {
  getAppConfig,
  getViewConfig
};

export default configService;