import { ComponentClass, FunctionComponent } from 'react';
import { AppViewLayout } from '../types';

import EmptyLayout, { EmptyLayoutProps } from './EmptyLayout/EmptyLayout';
import HeaderAndSidenavLayout, { HeaderAndSidenavLayoutProps } from './HeaderAndSidenavLayout/HeaderAndSidenavLayout';
import ShareLayout from './ShareLayout/ShareLayout';

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
  {
    id: AppViewLayout.Share,
    component: ShareLayout,
  },
];

export default layouts;
