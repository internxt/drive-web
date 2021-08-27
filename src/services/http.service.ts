import axios, { AxiosRequestConfig } from 'axios';

const httpService = {
  get: <ResponseType>(url: string, config?: AxiosRequestConfig): Promise<ResponseType> => {
    return axios.get<ResponseType>(url, config).then(response => response.data);
  },

  post: <PayloadType, ResponseType>(url: string, data?: PayloadType, config?: AxiosRequestConfig): Promise<ResponseType> => {
    return axios.post<ResponseType>(url, data, config).then(response => response.data);
  },

  delete: <ResponseType>(url: string, config?: AxiosRequestConfig): Promise<ResponseType> => {
    return axios.delete<ResponseType>(url, config).then(response => response.data);
  }
};

export default httpService;