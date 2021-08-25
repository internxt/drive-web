import axios, { AxiosRequestConfig } from 'axios';

const httpService = {
  get: <ResponseType>(url: string, config?: AxiosRequestConfig): Promise<ResponseType> => {
    return axios.get<ResponseType>(url).then(response => response.data);
  },

  post: <PayloadType, ResponseType>(url: string, data?: PayloadType, config?: AxiosRequestConfig): Promise<ResponseType> => {
    return axios.post<ResponseType>(url, data).then(response => response.data);
  },

  delete: <ResponseType>(url: string): Promise<ResponseType> => {
    return axios.delete<ResponseType>(url).then(response => response.data);
  }
};

export default httpService;