import { ComponentClass, FunctionComponent } from 'react';

import NewView from './NewView/NewView';
import DriveView from './DriveView/DriveView';
import RecentsView from './RecentsView/RecentsView';
import NotFoundView from './NotFoundView/NotFoundView';
import ReferredView from './ReferredView/ReferredVIew';
import AccountView from './AccountView/AccountView';
import JoinTeamView from './JoinTeamView/JoinTeamView';
import DeactivationView from './DeactivationView/DeactivationView';
import DeactivationTeamsView from './DeactivationTeamsView/DeactivationTeamsView';
import TeamSuccessView from '../views/TeamSuccessView/TeamSuccessView';
import CheckoutView from './CheckoutView/CheckoutView';
import ShareView from './ShareView/ShareView';
import SignInView from './SignInView/SignInView';
import SignUpView from './SignUpView/SignUpView';
import RemoveAccountView from './RemoveAccountView/RemoveAccountView';

const views: Array<{ id: string, component: string | FunctionComponent<any> | ComponentClass<any>, componentProps?: any }> = [
  { id: 'signup', component: SignUpView, componentProps: { isNewUser: true } },
  { id: 'appsumo', component: NewView, componentProps: { isNewUser: false } },
  { id: 'login', component: SignInView },
  { id: 'drive', component: DriveView },
  { id: 'recents', component: RecentsView },
  { id: 'account', component: AccountView },
  { id: 'teams-join', component: JoinTeamView },
  { id: 'deactivation', component: DeactivationView },
  { id: 'teams-deactivation', component: DeactivationTeamsView },
  { id: 'team-success', component: TeamSuccessView },
  { id: 'checkout', component: CheckoutView },
  { id: 'remove', component: RemoveAccountView },
  { id: 'share-token', component: ShareView },
  { id: 'not-found', component: NotFoundView }
];

export default views;