import { ComponentClass, FunctionComponent } from 'react';

import { AppView } from '../types';

import AuthView from '../../auth/views/Auth/AuthView';
import ButtonAuth from '../../auth/views/Auth/ButtonAuth';
import SignupBlog from '../../auth/views/Auth/SignupBlog';
import BlockedAccountView from '../../auth/views/BlockedAccountView/BlockedAccountView';
import RecoverAccountView from '../../auth/views/RecoverAccountView/RecoverAccountView';
import RecoveryLinkView from '../../auth/views/RecoveryLinkView/RecoveryLinkView';
import SignInView from '../../auth/views/SignInView/SignInView';
import SignUpView from '../../auth/views/SignUpView/SignUpView';
import UniversalLinkSuccessView from '../../auth/views/UnivesalLinkSuccessView/UniversalLinkSuccessView';
import BackupsView from '../../backups/views/BackupsView/BackupsView';
import DeactivationView from '../../core/views/DeactivationView/DeactivationView';
import DriveView from '../../drive/views/DriveView/DriveView';
import FolderFileNotFound from '../../drive/views/FolderFileNotFound/FolderFileNotFound';
import RecentsView from '../../drive/views/RecentsView/RecentsView';
import RequestAccess from '../../drive/views/RequestAccess/RequestAccess';
import TrashView from '../../drive/views/TrashView/TrashView';
import GuestAcceptInvitationView from '../../guests/views/GuestAcceptInviteView/GuestAcceptInviteView';
import CheckoutCancelView from '../../payment/views/CheckoutCancelView/CheckoutCancelView';
import CheckoutSuccessView from '../../payment/views/CheckoutSuccessView/CheckoutSuccessView';
import ShareFileView from '../../share/views/ShareView/ShareFileView';
import WorkspaceGuestSingUpView from '../../auth/components/SignUp/WorkspaceGuestSignUp';
import RedirectToAppView from '../../core/views/RedirectToAppView/RedirectToAppView';
import ShareFolderView from '../../share/views/ShareView/ShareFolderView';
import ShareGuestSingUpView from '../../share/views/SharedGuestSignUp/ShareGuestSingUpView';
import SharedViewWrapper from '../../share/views/SharedLinksView/SharedViewWrapper';
import ChangeEmailView from '../views/ChangeEmailView';
import NotFoundView from '../views/NotFoundView/NotFoundView';
import VerifyEmailView from '../views/VerifyEmailView';
import CheckoutViewWrapper from '../../payment/views/IntegratedCheckoutView/CheckoutViewWrapper';
import { CheckoutSessionId } from 'app/payment/views/CheckoutSession/CheckoutSessionId';

const views: Array<{
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: FunctionComponent<any> | ComponentClass<any>;
  componentProps?: Record<string, unknown>;
}> = [
  { id: AppView.Signup, component: SignUpView, componentProps: { isNewUser: true } },
  { id: AppView.AppSumo, component: SignInView },
  { id: AppView.BlockedAccount, component: BlockedAccountView },
  { id: AppView.Login, component: SignInView },
  { id: AppView.SignupBlog, component: SignupBlog },
  { id: AppView.ShareGuestAcceptInvite, component: ShareGuestSingUpView },
  { id: AppView.WorkspaceGuestInvite, component: WorkspaceGuestSingUpView },
  { id: AppView.Auth, component: AuthView },
  { id: AppView.ButtonAuth, component: ButtonAuth },
  { id: AppView.RecoverAccount, component: RecoverAccountView },
  { id: AppView.Recents, component: RecentsView },
  { id: AppView.Trash, component: TrashView },
  { id: AppView.Backups, component: BackupsView },
  { id: AppView.Shared, component: SharedViewWrapper },
  { id: AppView.FolderFileNotFound, component: FolderFileNotFound },
  { id: AppView.GuestAcceptInvite, component: GuestAcceptInvitationView },
  { id: AppView.Deactivation, component: DeactivationView },
  { id: AppView.CheckoutSuccess, component: CheckoutSuccessView },
  { id: AppView.CheckoutCancel, component: CheckoutCancelView },
  { id: AppView.CheckoutSession, component: CheckoutSessionId },
  { id: AppView.Checkout, component: CheckoutViewWrapper },
  { id: AppView.RecoveryLink, component: RecoveryLinkView },
  { id: AppView.ShareFileToken, component: ShareFileView },
  { id: AppView.ShareFileToken2, component: ShareFileView },
  { id: AppView.ShareFolderToken, component: ShareFolderView },
  { id: AppView.ShareFolderToken2, component: ShareFolderView },
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
