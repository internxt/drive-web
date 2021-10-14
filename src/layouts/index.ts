import { ComponentClass, FunctionComponent } from 'react';

import EmptyLayout, { EmptyLayoutProps } from './EmptyLayout/EmptyLayout';
import HeaderAndSidenavLayout, { HeaderAndSidenavLayoutProps } from './HeaderAndSidenavLayout/HeaderAndSidenavLayout';
import { AppViewLayout } from '../models/enums';

type AnyLayoutProps = EmptyLayoutProps | HeaderAndSidenavLayoutProps;

const layouts: Array<{
  id: string;
  component: string | FunctionComponent<AnyLayoutProps> | ComponentClass<AnyLayoutProps>;
}> = [
  {
    id: AppViewLayout.Empty,
    component: EmptyLayout,
  },
  {
    id: AppViewLayout.HeaderAndSidenav,
    component: HeaderAndSidenavLayout,
  },
];

export default layouts;
