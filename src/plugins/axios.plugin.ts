import axios from 'axios';

import { Workspace } from '../models/enums';
import { AppPlugin } from '../models/interfaces';
import localStorageService from '../services/local-storage.service';
import { userThunks } from '../store/slices/user';

const axiosPlugin: AppPlugin = {
  install(store): void {
    axios.defaults.baseURL = process.env.REACT_APP_API_URL;

    axios.interceptors.request.use(requestConfig => {
      const workspace = localStorageService.get('workspace');
      const isTeam = workspace === Workspace.Business;
      const bearerToken = isTeam ?
        localStorageService.get('xTokenTeam') :
        localStorageService.get('xToken');
      const mnemonic = isTeam ?
        localStorageService.getTeams()?.bridge_mnemonic :
        localStorageService.get('xMnemonic');

<<<<<<< HEAD
=======
      requestConfig.baseURL = process.env.REACT_APP_API_URL;

>>>>>>> master
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