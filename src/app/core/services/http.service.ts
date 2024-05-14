import axios, { AxiosRequestConfig } from 'axios';

import packageJson from '../../../../package.json';
import localStorageService from './local-storage.service';

export const HTTP_CODES = {
  MAX_SPACE_USED: 420,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
};

const httpService = {
  get: <ResponseType>(url: string, config?: AxiosRequestConfig): Promise<ResponseType> => {
    return axios.get<ResponseType>(url, config).then((response) => response.data);
  },

  post: <PayloadType, ResponseType>(
    url: string,
    data?: PayloadType,
    config?: AxiosRequestConfig,
  ): Promise<ResponseType> => {
    return axios.post<ResponseType>(url, data, config).then((response) => response.data);
  },

  delete: <ResponseType>(url: string, config?: AxiosRequestConfig): Promise<ResponseType> => {
    return axios.delete<ResponseType>(url, config).then((response) => response.data);
  },

  getHeaders(withAuth: boolean, withMnemonic: boolean, isTeam = false): Headers {
    const headers = new Headers();

    headers.append('content-type', 'application/json; charset=utf-8');
    headers.append('internxt-version', packageJson.version);
    headers.append('internxt-client', 'drive-web');

    if (withAuth) {
      isTeam
        ? headers.append('Authorization', `Bearer ${localStorageService.get('xTokenTeam')}`)
        : headers.append('Authorization', `Bearer ${localStorageService.get('xToken')}`);
    }

    return headers;
  },
};

export default httpService;
