import 'axios';
import { Workspace } from './types';

declare module 'axios' {
  export interface AxiosRequestConfig {
    authWorkspace?: Workspace;
  }
}
