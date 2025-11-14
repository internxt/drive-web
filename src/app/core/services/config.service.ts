import APP_CONFIG from '../config/app.json';
import ROUTES from '../../routes/paths.json';
import { DatabaseProvider } from '../../database/types';
import { AppConfig, AppViewConfig, AppViewLayout } from '../types';
import { DownloadFolderMethod } from 'app/drive/types';
import envService from 'app/core/services/env.service';

export function getAppConfig(): AppConfig {
  const getPath = (pathId: string, path) => {
    if (pathId == 'auth') {
      return `/${envService.getVariable('authUrl')}`;
    } else if (pathId == 'buttonAuth') {
      return `/${envService.getVariable('buttonAuthUrl')}`;
    } else {
      return path;
    }
  };

  const config: AppConfig = {
    ...APP_CONFIG,
    ...{
      fileExplorer: {
        ...APP_CONFIG.fileExplorer,
        download: {
          ...APP_CONFIG.fileExplorer.download,
          folder: {
            ...APP_CONFIG.fileExplorer.download.folder,
            method: APP_CONFIG.fileExplorer.download.folder.method as DownloadFolderMethod,
          },
        },
      },
      views: ROUTES.views.map((v) => ({
        ...v,
        layout: v.layout as AppViewLayout,
        path: getPath(v.id, v.path),
      })),
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
