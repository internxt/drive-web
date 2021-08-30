import 'axios';

import { Workspace } from './enums';

declare module 'axios' {
  export interface AxiosRequestConfig {
    authWorkspace?: Workspace;
  }
}
