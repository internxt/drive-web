import { ClassicComponentClass, Component, ComponentClass, FunctionComponent, ReactNode } from 'react';

import LoginView from './LoginView/LoginView';
import NewView from './NewView/NewView';
import DriveView from './DriveView/DriveView';
import StorageView from './StorageView/StorageView';
import MaintenanceView from './MaintenanceView/MaintenanceView';
import NotFoundView from './NotFoundView/NotFoundView';
import ReferredView from './ReferredView/ReferredVIew';
import AccountView from './AccountView/AccountView';
import TeamsView from './TeamsView/TeamsView';
import JoinTeamView from './JoinTeamView/JoinTeamView';
import ResetView from './ResetView/ResetView';
import ActivationView from './ActivationView/ActivationView';
import DeactivationView from './DeactivationView/DeactivationView';
import SecurityView from './SecurityView/SecurityView';
import DeactivationTeamsView from './DeactivationTeamsView/DeactivationTeamsView';
import TeamSuccessView from '../views/TeamSuccessView/TeamSuccessView';
import CheckoutView from './CheckoutView/CheckoutView';
import RemoveView from './RemoveView/RemoveView';
import ShareView from './ShareView/ShareView';

const views: Array<{ id: string, component: string | FunctionComponent<any> | ComponentClass<any>, componentProps?: any }> = [
  { id: 'new', component: NewView, componentProps: { isNewUser: true } },
  { id: 'activate', component: NewView, componentProps: { isNewUser: true } },
  { id: 'appsumo', component: NewView, componentProps: { isNewUser: false } },
  { id: 'login', component: LoginView },
  { id: 'invite', component: ReferredView },
  { id: 'drive', component: DriveView },
  { id: 'recents', component: DriveView },
  { id: 'storage', component: StorageView },
  { id: 'account', component: AccountView },
  { id: 'teams', component: TeamsView },
  { id: 'teams-cancel', component: TeamsView },
  { id: 'teams-join', component: JoinTeamView },
  { id: 'activation', component: ActivationView },
  { id: 'deactivation', component: DeactivationView },
  { id: 'teams-deactivation', component: DeactivationTeamsView },
  { id: 'security', component: SecurityView },
  { id: 'team-success', component: TeamSuccessView },
  { id: 'checkout', component: CheckoutView },
  { id: 'reset', component: ResetView },
  { id: 'reset-token', component: ResetView },
  { id: 'settings', component: ResetView },
  { id: 'remove', component: RemoveView },
  { id: 'share', component: ShareView },
  { id: 'maintenance', component: MaintenanceView },
  { id: 'not-found', component: NotFoundView }
];

export default views;