import { ComponentClass, FunctionComponent } from 'react';

import DriveView from './DriveView/DriveView';
import RecentsView from './RecentsView/RecentsView';
import NotFoundView from './NotFoundView/NotFoundView';
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
import { AppView } from '../models/enums';
import GuestAcceptInvitationView from './GuesAcceptInviteView/GuestAcceptInviteView';

const views: Array<{
  id: string;
  component: string | FunctionComponent<any> | ComponentClass<any>;
  componentProps?: Record<string, unknown>;
}> = [
  { id: AppView.Signup, component: SignUpView, componentProps: { isNewUser: true } },
  { id: AppView.AppSumo, component: SignUpView, componentProps: { isNewUser: false } },
  { id: AppView.Login, component: SignInView },
  { id: AppView.Drive, component: DriveView },
  { id: AppView.Recents, component: RecentsView },
  { id: AppView.Account, component: AccountView },
  { id: AppView.TeamsJoin, component: JoinTeamView },
  { id: AppView.GuestAcceptInvite, component: GuestAcceptInvitationView },
  { id: AppView.Deactivation, component: DeactivationView },
  { id: AppView.TeamsDeactivation, component: DeactivationTeamsView },
  { id: AppView.TeamSuccess, component: TeamSuccessView },
  { id: AppView.Checkout, component: CheckoutView },
  { id: AppView.Remove, component: RemoveAccountView },
  { id: AppView.ShareToken, component: ShareView },
  { id: AppView.NotFound, component: NotFoundView },
];

export default views;
