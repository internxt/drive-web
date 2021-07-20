import { ComponentClass, FunctionComponent } from 'react';

import NewView from './NewView/NewView';
import DriveView from './DriveView/DriveView';
import StorageView from './StorageView/StorageView';
import NotFoundView from './NotFoundView/NotFoundView';
import ReferredView from './ReferredView/ReferredVIew';
import AccountView from './AccountView/AccountView';
import TeamsView from './TeamsView/TeamsView';
import JoinTeamView from './JoinTeamView/JoinTeamView';
import ResetView from './ResetView/ResetView';
import DeactivationView from './DeactivationView/DeactivationView';
import SecurityView from './SecurityView/SecurityView';
import DeactivationTeamsView from './DeactivationTeamsView/DeactivationTeamsView';
import TeamSuccessView from '../views/TeamSuccessView/TeamSuccessView';
import CheckoutView from './CheckoutView/CheckoutView';
import RemoveView from './RemoveView/RemoveView';
import ShareView from './ShareView/ShareView';
import SignInView from './SignInView/SignInView';
import SignUpView from './SignUpView/SignUpView';

const views: Array<{ id: string, component: string | FunctionComponent<any> | ComponentClass<any>, componentProps?: any }> = [
  { id: 'new', component: SignUpView, componentProps: { isNewUser: true } },
  { id: 'appsumo', component: NewView, componentProps: { isNewUser: false } },
  { id: 'login', component: SignInView },
  { id: 'invite', component: ReferredView },
  { id: 'drive', component: DriveView },
  { id: 'recents', component: DriveView },
  { id: 'storage', component: StorageView },
  { id: 'account', component: AccountView },
  { id: 'teams', component: TeamsView },
  { id: 'teams-cancel', component: TeamsView },
  { id: 'teams-join', component: JoinTeamView },
  { id: 'deactivation', component: DeactivationView },
  { id: 'teams-deactivation', component: DeactivationTeamsView },
  { id: 'security', component: SecurityView },
  { id: 'team-success', component: TeamSuccessView },
  { id: 'checkout', component: CheckoutView },
  { id: 'reset', component: ResetView },
  { id: 'reset-token', component: ResetView },
  { id: 'settings', component: ResetView },
  { id: 'remove', component: RemoveView },
  { id: 'share-token', component: ShareView },
  { id: 'not-found', component: NotFoundView }
];

export default views;