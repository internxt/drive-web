import { createBrowserHistory } from 'history';
import queryString from 'query-string';

import { AppView } from '../models/enums';
import { AppViewConfig } from '../models/interfaces';
import { PATH_NAMES } from './analytics.service';
import configService from './config.service';

const instance = createBrowserHistory({ forceRefresh: false });

instance.listen((nav) => {
  const keys = Object.keys(PATH_NAMES);
  const index = keys.indexOf(nav.pathname);

  if (index > -1) {
    const pageName = PATH_NAMES[keys[index]];

    window.analytics.page(pageName);
  }
});

const navigationService = {
  history: instance,
  getCurrentView(): AppViewConfig | undefined {
    return configService.getAppConfig().views.find((v) => v.path === instance.location.pathname);
  },
  push(viewId: AppView, queryMap: Record<string, unknown> = {}): void {
    const viewConfig = configService.getViewConfig({ id: viewId });
    const viewSearch = queryString.stringify(queryMap);

    if (!viewConfig) {
      console.warn(`(NavigationService) View with ID ${viewId} not found`);
    }

    instance.push({ pathname: viewConfig?.path || 'view-not-found', search: viewSearch });
  },
};

export default navigationService;
