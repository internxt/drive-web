import { BrowserHistoryBuildOptions, createBrowserHistory } from 'history';
import queryString from 'query-string';

import { PATH_NAMES, serverPage } from '../../analytics/services/analytics.service';
import { AppView } from '../types';
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

    instance.push({ pathname: viewConfig?.path ?? 'view-not-found', search: viewSearch });
  },
  pushFolder(uuid: string | undefined): void {
    instance.push(`/folder/${uuid}`);
  },
  pushFile(uuid: string | undefined): void {
    instance.push(`/file/${uuid}`);
  },
  isCurrentPath(path: string): boolean {
    const pathname = navigationService.history.location.pathname.split('/');
    const currentPath = pathname[1];
    return currentPath === path;
  },
  getUuid(): string | undefined {
    const pathname = navigationService.history.location.pathname.split('/');
    const lastSegment = pathname[pathname.length - 1];
    return lastSegment;
  },
  replaceState(uuid: string | undefined): void {
    const pathname = navigationService.history.location.pathname.split('/');
    pathname[pathname.length - 1] = uuid ?? '';
    const newPathname = pathname.join('/');
    window.history.replaceState(null, '', newPathname);
  },
};

export default navigationService;
