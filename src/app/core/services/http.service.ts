import axios, { AxiosRequestConfig, AxiosRequestHeaders } from 'axios';

import packageJson from '../../../../package.json';
import localStorageService from './local-storage.service';

export const HTTP_CODES = {
  MAX_SPACE_USED: 420,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
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

  getHeaders(withAuth: boolean, withMnemonic: boolean, isTeam = false): AxiosRequestHeaders {
    const headers = new Headers();

    headers.append('content-type', 'application/json; charset=utf-8');
    headers.append('internxt-version', packageJson.version);
    headers.append('internxt-client', 'drive-web');

    if (withAuth) {
      isTeam
        ? headers.append('Authorization', `Bearer ${localStorageService.get('xTokenTeam')}`)
        : headers.append('Authorization', `Bearer ${localStorageService.get('xToken')}`);
    }

    const headersObject = Object.fromEntries(headers);
    return headersObject as AxiosRequestHeaders;
  },
  convertHeadersToNativeHeaders(serviceHeaders: AxiosRequestHeaders): Headers {
    const headers = new Headers();

    for (const [key, value] of Object.entries(serviceHeaders)) {
      if (value) headers.append(key, value.toString());
    }

    return headers;
  },
};

export default httpService;
