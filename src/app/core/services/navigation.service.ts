import { BrowserHistoryBuildOptions, createBrowserHistory } from 'history';
import queryString from 'query-string';

import { PATH_NAMES, serverPage } from '../../analytics/services/analytics.service';
import { AppView, AppViewConfig } from '../types';
import configService from './config.service';

const browserHistoryConfig: BrowserHistoryBuildOptions = {
  forceRefresh: false,
};

if (process.env.REACT_APP_BASE_URL) {
  browserHistoryConfig.basename = process.env.REACT_APP_BASE_URL;
}

const instance = createBrowserHistory(browserHistoryConfig);

instance.listen((nav) => {
  const keys = Object.keys(PATH_NAMES);
  const index = keys.indexOf(nav.pathname);

  if (index > -1) {
    const pageName = PATH_NAMES[keys[index]];

    window.rudderanalytics.page(pageName);
    serverPage(pageName).catch(() => {
      // NO OP
    });
  }
});

const navigationService = {
  history: instance,
  push(viewId: AppView, queryMap: Record<string, unknown> = {}): void {
    const viewConfig = configService.getViewConfig({ id: viewId });
    const viewSearch = queryString.stringify(queryMap);

    if (!viewConfig) {
      console.warn(`(NavigationService) View with ID ${viewId} not found`);
    }

    instance.push({ pathname: viewConfig?.path || 'view-not-found', search: viewSearch });
  },
  pushFolder(uuid: string | undefined): void {
    instance.push(`/app/folder/${uuid}`);
  },
  pushFile(uuid: string | undefined): void {
    instance.push(`/app/file/${uuid}`);
  },
  isCurrentPath(path: string): boolean {
    const pathname = navigationService.history.location.pathname.split('/');
    const currentPath = pathname[2];
    return currentPath === path;
  },
};

export default navigationService;
