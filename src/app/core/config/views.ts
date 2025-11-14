import { ComponentClass, FunctionComponent } from 'react';

import { AppView } from '../types';

import { AuthView, ButtonAuth, SignupBlog } from '../../../views/Signup/components';
import BlockedAccountView from '../../auth/views/BlockedAccountView/BlockedAccountView';
import RecoverAccountView from '../../auth/views/RecoverAccountView/RecoverAccountView';
import RecoveryLinkView from '../../auth/views/RecoveryLinkView/RecoveryLinkView';
import SignInView from '../../auth/views/SignInView/SignInView';
import SignUpView, { ShareGuestSignUpView, WorkspaceGuestSignUpView } from '../../../views/Signup';
import UniversalLinkView from '../../auth/views/UniversalLinkView/UniversalLinkView';
import UniversalLinkOkView from '../../auth/views/UniversalLinkView/UniversalLinkOkView';
import UniversalLinkErrorView from '../../auth/views/UniversalLinkView/UniversalLinkErrorView';
import BackupsView from '../../../views/Backups/BackupsView';
import DeactivationView from '../../core/views/DeactivationView/DeactivationView';
import DriveView from 'views/Drive';
import FolderFileNotFound from 'app/drive/views/FolderFileNotFound/FolderFileNotFound';
import RecentsView from 'views/Recents';
import RequestAccess from 'app/drive/views/RequestAccess/RequestAccess';
import TrashView from 'views/Trash';
import CheckoutCancelView from '../../payment/views/CheckoutCancelView/CheckoutCancelView';
import CheckoutSuccessView from '../../payment/views/CheckoutSuccessView/CheckoutSuccessView';
import { ShareFileView, ShareFolderView } from '../../../views/PublicShared';
import RedirectToAppView from '../../core/views/RedirectToAppView/RedirectToAppView';
import SharedViewWrapper from '../../../views/Shared/SharedViewWrapper';
import ChangeEmailView from '../views/ChangeEmailView';
import NotFoundView from '../views/NotFoundView/NotFoundView';
import VerifyEmailView from '../views/VerifyEmailView';
import CheckoutViewWrapper from '../../payment/views/IntegratedCheckoutView/CheckoutViewWrapper';
import { CheckoutSessionId } from 'app/payment/views/CheckoutSession/CheckoutSessionId';
import PcCloudSuccess from 'app/payment/views/CheckoutSuccessView/PcCloudSuccess';

const views: Array<{
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: FunctionComponent<any> | ComponentClass<any>;
  componentProps?: Record<string, unknown>;
}> = [
  { id: AppView.Signup, component: SignUpView },
  { id: AppView.AppSumo, component: SignInView },
  { id: AppView.BlockedAccount, component: BlockedAccountView },
  { id: AppView.Login, component: SignInView },
  { id: AppView.SignupBlog, component: SignupBlog },
  { id: AppView.ShareGuestAcceptInvite, component: ShareGuestSignUpView },
  { id: AppView.WorkspaceGuestInvite, component: WorkspaceGuestSignUpView },
  { id: AppView.Auth, component: AuthView },
  { id: AppView.ButtonAuth, component: ButtonAuth },
  { id: AppView.RecoverAccount, component: RecoverAccountView },
  { id: AppView.Recents, component: RecentsView },
  { id: AppView.Trash, component: TrashView },
  { id: AppView.Backups, component: BackupsView },
  { id: AppView.Shared, component: SharedViewWrapper },
  { id: AppView.FolderFileNotFound, component: FolderFileNotFound },
  { id: AppView.Deactivation, component: DeactivationView },
  { id: AppView.CheckoutSuccess, component: CheckoutSuccessView },
  { id: AppView.PcCloudSuccess, component: PcCloudSuccess },
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
  { id: AppView.UniversalLinkSuccess, component: UniversalLinkView },
  { id: AppView.UniversalLinkOk, component: UniversalLinkOkView },
  { id: AppView.UniversalLinkError, component: UniversalLinkErrorView },
  // Leave these routes last, otherwise it will match react router and may cause malfunctioning.
  { id: AppView.DriveItems, component: DriveView },
  { id: AppView.Drive, component: DriveView },
  { id: AppView.NotFound, component: NotFoundView },
];

export default views;
