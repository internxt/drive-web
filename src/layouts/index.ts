import { ComponentClass, FunctionComponent } from 'react';

import HeaderAndSidenavLayout from './HeaderAndSidenavLayout/HeaderAndSidenavLayout';
import { AppViewLayout } from '../models/enums';

const layouts: Array<{id: string, component: string | FunctionComponent<any> | ComponentClass<any>}> = [
  {
    id: AppViewLayout.Empty,
    component: 'div'
  },
  {
    id: AppViewLayout.HeaderAndSidenav,
    component: HeaderAndSidenavLayout
  }
];

export default layouts;