import axios from 'axios';

import packageJson from '../../package.json';
import { Workspace } from '../models/enums';
import { AppPlugin } from '../models/interfaces';
import localStorageService from '../services/localStorage.service';
import { userThunks } from '../store/slices/user';

const axiosPlugin: AppPlugin = {
  install(store): void {
    axios.interceptors.request.use(requestConfig => {
      const workspace = localStorageService.get('workspace');
      const isTeam = workspace === Workspace.Business;
      const bearerToken = !isTeam ?
        localStorageService.get('xToken') :
        localStorageService.get('xTokenTeam');
      const mnemonic = isTeam ?
        localStorageService.getTeams().bridge_mnemonic :
        localStorageService.get('xMnemonic');

      requestConfig.baseURL = packageJson.proxy;

      requestConfig.headers = {
        'content-type': 'application/json; charset=utf-8',
        'internxt-version': '1.0.0',
        'internxt-client': 'drive-web',
        Authorization: `Bearer ${bearerToken}`,
        'internxt-mnemonic': mnemonic
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
  }
};

export default axiosPlugin;