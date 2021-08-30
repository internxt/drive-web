import axios from 'axios';

import { LocalStorageItem, Workspace } from '../models/enums';
import { AppPlugin } from '../models/interfaces';
import localStorageService from '../services/local-storage.service';
import { userThunks } from '../store/slices/user';

const axiosPlugin: AppPlugin = {
  install(store): void {
    axios.defaults.baseURL = process.env.REACT_APP_API_URL;

    axios.interceptors.request.use((requestConfig) => {
      const tokenByWorkspace: { [key in Workspace]: string } = {
        [Workspace.Personal]: localStorageService.get('xToken') || '',
        [Workspace.Business]: localStorageService.get('xTokenTeam') || '',
      };
      const mnemonicByWorkspace: { [key in Workspace]: string } = {
        [Workspace.Personal]: localStorageService.get('xMnemonic') || '',
        [Workspace.Business]: localStorageService.getTeams()?.bridge_mnemonic || '',
      };
      const workspace =
        requestConfig.authWorkspace ||
        (localStorageService.get(LocalStorageItem.Workspace) as Workspace) ||
        Workspace.Personal;

      console.log('axios.plugin url: ', requestConfig.url);
      console.log('axios.plugin workspace: ', workspace);
      console.log('axios.plugin token: ', tokenByWorkspace[workspace]);

      requestConfig.headers = {
        'content-type': 'application/json; charset=utf-8',
        'internxt-version': '1.0.0',
        'internxt-client': 'drive-web',
        Authorization: `Bearer ${tokenByWorkspace[workspace]}`,
        'internxt-mnemonic': mnemonicByWorkspace[workspace],
      };

      return requestConfig;
    });

    axios.interceptors.response.use(undefined, (error) => {
      if (error.response) {
        if (error.response.status === 401) {
          store.dispatch(userThunks.logoutThunk());
        }
      }

      return Promise.reject(error);
    });
  },
};

export default axiosPlugin;
