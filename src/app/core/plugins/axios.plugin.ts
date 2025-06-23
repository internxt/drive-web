import * as Sentry from '@sentry/react';
import axios, { AxiosHeaders } from 'axios';
import packageJson from '../../../../package.json';
import { AppPlugin, LocalStorageItem, Workspace } from '../../core/types';
import { userThunks } from '../../store/slices/user';
import localStorageService from '../services/local-storage.service';
import envService from 'app/core/services/env.service';

const axiosPlugin: AppPlugin = {
  install(store): void {
    axios.defaults.baseURL = envService.getVaribale('api');

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

      const headers = new AxiosHeaders({
        'content-type': 'application/json; charset=utf-8',
        'internxt-version': packageJson.version,
        'internxt-client': 'drive-web',
        Authorization: `Bearer ${tokenByWorkspace[workspace]}`,
      });

      if (requestConfig.headers) {
        Object.entries(requestConfig.headers).forEach(([key, value]) => {
          if (value !== undefined) {
            headers.set(key, value);
          }
        });
      }

      requestConfig.headers = headers;

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
