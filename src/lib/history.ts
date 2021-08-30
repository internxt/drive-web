import { createBrowserHistory } from 'history';
import { PATH_NAMES } from '../services/analytics.service';

const instance = createBrowserHistory({ forceRefresh: false });

instance.listen((nav) => {
  const keys = Object.keys(PATH_NAMES);
  const index = keys.indexOf(nav.pathname);

  if (index > -1) {
    const pageName = PATH_NAMES[keys[index]];

    window.analytics.page(pageName);
  }
});

export default instance;
