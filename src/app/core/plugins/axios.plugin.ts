import packageJson from '../../../../package.json';
import axios from 'axios';
import * as Sentry from '@sentry/react';

import { LocalStorageItem, Workspace, AppPlugin } from '../../core/types';
import localStorageService from '../services/local-storage.service';
import { userThunks } from '../../store/slices/user';

const axiosPlugin: AppPlugin = {
  install(store): void {
    axios.defaults.baseURL = process.env.REACT_APP_API_URL;

    axios.interceptors.request.use((requestConfig) => {
      const user = localStorageService.getUser();

      if (user) {
        Sentry.setUser({
          id: user.uuid,
          email: user.email,
          sharedWorkspace: user.sharedWorkspace,
        });
      }

      const tokenByWorkspace: { [key in Workspace]: string } = {
        [Workspace.Individuals]: localStorageService.get('xToken') || '',
        [Workspace.Business]: localStorageService.get('xTokenTeam') || '',
      };
      const workspace =
        requestConfig.authWorkspace ||
        (localStorageService.get(LocalStorageItem.Workspace) as Workspace) ||
        Workspace.Individuals;

      requestConfig.headers = {
        'content-type': 'application/json; charset=utf-8',
        'internxt-version': packageJson.version,
        'internxt-client': 'drive-web',
        Authorization: `Bearer ${tokenByWorkspace[workspace]}`,
        ...requestConfig.headers,
      };

      return requestConfig;
    });

    axios.interceptors.response.use(undefined, (err) => {
      if (err.response) {
        if (err.response.status === 401) {
          store.dispatch(userThunks.logoutThunk());
        }
      }

      return Promise.reject(err);
    });
  },
};

export default axiosPlugin;
