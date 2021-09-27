import APP_CONFIG from '../config/app.json';
import { AppViewLayout } from '../models/enums';
import { AppConfig, AppViewConfig } from '../models/interfaces';
import { DatabaseProvider } from './database.service';

export function getAppConfig(): AppConfig {
  const config: AppConfig = {
    ...APP_CONFIG,
    ...{
      views: APP_CONFIG.views.map((v) => ({ ...v, layout: v.layout as AppViewLayout })),
      database: { ...APP_CONFIG.database, provider: APP_CONFIG.database.provider as DatabaseProvider },
    },
  };

  return config;
}

export function getViewConfig(filter: Partial<AppViewConfig>): AppViewConfig | undefined {
  const config = getAppConfig();

  return config.views.find((v) =>
    Object.keys(filter).reduce((t: boolean, key: string) => {
      return v[key] === filter[key] && t;
    }, true),
  );
}

const configService = {
  getAppConfig,
  getViewConfig,
};

export default configService;
