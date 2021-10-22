import * as Unicons from '@iconscout/react-unicons';
import { FunctionComponent, SVGProps } from 'react';

import AccountPasswordTab from './AccountPasswordTab/AccountPasswordTab';
import AccountInfoTab from './AccountInfoTab/AccountInfoTab';
import AccountPlansTab from './AccountPlansTab/AccountPlansTab';
import AccountSecurityTab from './AccountSecurityTab/AccountSecurityTab';
import i18n from '../../../../i18n/services/i18n.service';

export enum AccountViewTab {
  Info = 'info',
  Plans = 'plans',
  Password = 'password',
  Security = 'security',
}

export interface AccountViewTabData {
  id: AccountViewTab;
  component: () => JSX.Element;
  title: string;
  description: string;
  icon: FunctionComponent<SVGProps<SVGSVGElement>>;
}

export default [
  {
    id: AccountViewTab.Info,
    component: AccountInfoTab,
    title: i18n.get('views.account.tabs.info.title'),
    description: i18n.get('views.account.tabs.info.description'),
    icon: Unicons.UilReceipt,
  },
  {
    id: AccountViewTab.Plans,
    component: AccountPlansTab,
    title: i18n.get('views.account.tabs.plans.title'),
    description: i18n.get('views.account.tabs.plans.description'),
    icon: Unicons.UilSuitcase,
  },
  {
    id: AccountViewTab.Password,
    component: AccountPasswordTab,
    title: i18n.get('views.account.tabs.password.title'),
    description: i18n.get('views.account.tabs.password.description'),
    icon: Unicons.UilLock,
  },
  {
    id: AccountViewTab.Security,
    component: AccountSecurityTab,
    title: i18n.get('views.account.tabs.security.title'),
    description: i18n.get('views.account.tabs.security.description'),
    icon: Unicons.UilShieldPlus,
  },
];
