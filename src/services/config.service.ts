import APP_CONFIG from '../config/app.json';
import { AppConfig, AppViewConfig } from '../models/interfaces';

export function getAppConfig(): AppConfig {
  return APP_CONFIG;
}

export function getViewConfig(viewId: string): AppViewConfig | undefined {
  return APP_CONFIG.views.find(v => v.id === viewId);
}

const configService = {
  getAppConfig,
  getViewConfig
};

export default configService;