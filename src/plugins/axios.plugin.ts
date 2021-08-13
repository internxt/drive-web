import axios from 'axios';

import packageJson from '../../package.json';
import { Workspace } from '../models/enums';
import { AppPlugin } from '../models/interfaces';
import localStorageService from '../services/localStorage.service';

const axiosPlugin: AppPlugin = {
  install(): void {
    const workspace = localStorageService.get('workspace');
    const isTeam = workspace === Workspace.Business;
    const bearerToken = !isTeam ?
      localStorageService.get('xToken') :
      localStorageService.get('xTokenTeam');
    const mnemonic = isTeam ?
      localStorageService.getTeams().bridge_mnemonic :
      localStorageService.get('xMnemonic');

    axios.defaults.baseURL = packageJson.proxy;

    axios.defaults.headers = {
      'content-type': 'application/json; charset=utf-8',
      'internxt-version': '1.0.0',
      'internxt-client': 'drive-web',
      Authorization: `Bearer ${bearerToken}`,
      'internxt-mnemonic': mnemonic
    };
  }
};

export default axiosPlugin;