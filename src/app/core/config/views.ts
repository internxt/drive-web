import { ComponentClass, FunctionComponent } from 'react';

import { AppView } from '../types';

import AuthView from 'app/auth/views/Auth/AuthView';
import ButtonAuth from 'app/auth/views/Auth/ButtonAuth';
import SignupBlog from 'app/auth/views/Auth/SignupBlog';
import BlockedAccountView from 'app/auth/views/BlockedAccountView/BlockedAccountView';
import RecoverAccountView from 'app/auth/views/RecoverAccountView/RecoverAccountView';
import RecoveryLinkView from 'app/auth/views/RecoveryLinkView/RecoveryLinkView';
import SignInView from 'app/auth/views/SignInView/SignInView';
import SignUpView from 'app/auth/views/SignUpView/SignUpView';
import UniversalLinkSuccessView from 'app/auth/views/UnivesalLinkSuccessView/UniversalLinkSuccessView';
import BackupsView from 'app/backups/views/BackupsView/BackupsView';
import DeactivationView from 'app/core/views/DeactivationView/DeactivationView';
import Preferences from 'app/core/views/Preferences';
import DriveView from 'app/drive/views/DriveView/DriveView';
import FolderFileNotFound from 'app/drive/views/FolderFileNotFound/FolderFileNotFound';
import RecentsView from 'app/drive/views/RecentsView/RecentsView';
import RequestAccess from 'app/drive/views/RequestAccess/RequestAccess';
import TrashView from 'app/drive/views/TrashView/TrashView';
import GuestAcceptInvitationView from 'app/guests/views/GuestAcceptInviteView/GuestAcceptInviteView';
import CheckoutCancelView from 'app/payment/views/CheckoutCancelView/CheckoutCancelView';
import CheckoutSuccessView from 'app/payment/views/CheckoutSuccessView/CheckoutSuccessView';
import CheckoutPlanView from 'app/payment/views/CheckoutView/CheckoutPlanView';
import CheckoutView from 'app/payment/views/CheckoutView/CheckoutView';
import ShareFileView from 'app/share/views/ShareView/ShareFileView';
import DeactivationTeamsView from 'app/teams/views/DeactivationTeamsView/DeactivationTeamsView';
import JoinTeamView from 'app/teams/views/JoinTeamView/JoinTeamView';
import TeamSuccessView from 'app/teams/views/TeamSuccessView/TeamSuccessView';
import RedirectToAppView from '../../core/views/RedirectToAppView/RedirectToAppView';
import ShareFolderView from '../../share/views/ShareView/ShareFolderView';
import SharePhotosView from '../../share/views/ShareView/SharePhotosView';
import ShareGuestSingUpView from '../../share/views/SharedGuestSignUp/ShareGuestSingUpView';
import SharedViewWrapper from '../../share/views/SharedLinksView/SharedViewWrapper';
import ChangeEmailView from '../views/ChangeEmailView';
import NotFoundView from '../views/NotFoundView/NotFoundView';
import VerifyEmailView from '../views/VerifyEmailView';

const views: Array<{
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: FunctionComponent<any> | ComponentClass<any>;
  componentProps?: Record<string, unknown>;
}> = [
  { id: AppView.Signup, component: SignUpView, componentProps: { isNewUser: true } },
  { id: AppView.AppSumo, component: SignUpView, componentProps: { isNewUser: false } },
  { id: AppView.BlockedAccount, component: BlockedAccountView },
  { id: AppView.Login, component: SignInView },
  { id: AppView.SignupBlog, component: SignupBlog },
  { id: AppView.ShareGuestAcceptInvite, component: ShareGuestSingUpView },
  { id: AppView.Auth, component: AuthView },
  { id: AppView.ButtonAuth, component: ButtonAuth },
  { id: AppView.RecoverAccount, component: RecoverAccountView },
  { id: AppView.Recents, component: RecentsView },
  { id: AppView.Trash, component: TrashView },
  { id: AppView.Backups, component: BackupsView },
  { id: AppView.Shared, component: SharedViewWrapper },
  { id: AppView.Preferences, component: Preferences },
  { id: AppView.FolderFileNotFound, component: FolderFileNotFound },
  { id: AppView.TeamsJoin, component: JoinTeamView },
  { id: AppView.GuestAcceptInvite, component: GuestAcceptInvitationView },
  { id: AppView.Deactivation, component: DeactivationView },
  { id: AppView.TeamsDeactivation, component: DeactivationTeamsView },
  { id: AppView.TeamSuccess, component: TeamSuccessView },
  { id: AppView.CheckoutSuccess, component: CheckoutSuccessView },
  { id: AppView.CheckoutCancel, component: CheckoutCancelView },
  { id: AppView.Checkout, component: CheckoutView },
  { id: AppView.CheckoutPlan, component: CheckoutPlanView },
  { id: AppView.RecoveryLink, component: RecoveryLinkView },
  { id: AppView.ShareFileToken, component: ShareFileView },
  { id: AppView.ShareFolderToken, component: ShareFolderView },
  { id: AppView.SharePhotosToken, component: SharePhotosView },
  { id: AppView.RedirectToApp, component: RedirectToAppView },
  { id: AppView.VerifyEmail, component: VerifyEmailView },
  { id: AppView.ChangeEmail, component: ChangeEmailView },
  { id: AppView.RequestAccess, component: RequestAccess },
  { id: AppView.UniversalLinkSuccess, component: UniversalLinkSuccessView },
  // Leave these routes last, otherwise it will match react router and may cause malfunctioning.
  { id: AppView.DriveItems, component: DriveView },
  { id: AppView.Drive, component: DriveView },
  { id: AppView.NotFound, component: NotFoundView },
];

export default views;
