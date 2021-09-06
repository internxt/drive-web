import { createBrowserHistory } from 'history';
import { AppView } from '../models/enums';

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
  push(viewId: AppView, queryMap: Record<string, unknown>): void {
    const viewConfig = configService.getViewConfig(viewId);

    if (!viewConfig) {
      console.warn(`(NavigationService) View with ID ${viewId} not found`);
    }

    instance.push({ pathname: viewConfig?.id || 'view-not-found' });
  },
};

export default navigationService;
