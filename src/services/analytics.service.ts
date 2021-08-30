import * as prettySize from 'prettysize';
import { AnalyticsTrack, DevicePlatform } from '../models/enums';
import { UserSettings } from '../models/interfaces';
import localStorageService from './local-storage.service';

export const PATH_NAMES = {
  '/new': 'drive-web-register',
  '/login': 'drive-web-login',
  '/storage': 'drive-web-storage',
  '/settings': 'drive-web-settings',
  '/invite': 'drive-web-invite',
  '/remove': 'drive-web-remove',
};

const payload = {
  usage: 0,
  limit: 0,
  plan: 0,
};

export function page(pageName: string): void {
  window.analytics.page(pageName);
}

function getUser(): UserSettings {
  return localStorageService.getUser() as UserSettings;
}

function identifyPlanName(bytes: number): string {
  return bytes === 0 ? 'Free 2GB' : prettySize(bytes);
}

export function identifyUsage(newValue) {
  if (newValue !== payload.usage) {
    payload.usage = newValue;
    window.analytics.identify(getUser().uuid, { userId: getUser().uuid, storage: newValue, platform: 'web' });
  }
}

export function identifyPlan(newValue: number) {
  if (newValue !== payload.plan) {
    payload.plan = newValue;
    window.analytics.identify(getUser().uuid, {
      userId: getUser().uuid,
      plan: identifyPlanName(newValue),
      platform: 'web',
    });
  }
}

export function trackSignOut() {
  window.analytics.track(AnalyticsTrack.SignOut, {
    email: getUser().email,
  });
}

export function trackSignIn(payload: { email: string; userId: string }): void {
  window.analytics.track(AnalyticsTrack.SignIn, payload);
}

export function signInAttempted(email: string, error: string | Error): void {
  window.analytics.track(AnalyticsTrack.SignInAttempted, {
    status: 'error',
    msg: error ? error : 'Login error',
    email: email,
  });
}

export function trackSignUp(payload: { properties: { userId: string; email: string } }): void {
  window.analytics.track(AnalyticsTrack.SignUp, payload);
}

export function trackUserEnterPayments(): void {
  window.analytics.track(AnalyticsTrack.UserEnterPayments);
}

export function trackPlanSubscriptionSelected(payload: {
  price: string;
  plan_type: string;
  payment_type: string;
  plan_length: number;
  email: string;
}): void {
  window.analytics.track(AnalyticsTrack.PlanSubscriptionSelected, payload);
}

export function trackFolderCreated(payload: { email: string; platform: DevicePlatform }): void {
  window.analytics.track(AnalyticsTrack.FolderCreated, payload);
}

export function trackFolderRename(payload: { email: string; fileId: number; platform: DevicePlatform }): void {
  window.analytics.track(AnalyticsTrack.FolderRename, payload);
}

export function trackFileRename(payload: { email: string; file_id: number | string; platform: DevicePlatform }): void {
  window.analytics.track(AnalyticsTrack.FileRename, payload);
}

export function trackFileDownloadStart(payload: {
  file_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  email: string;
  folder_id: number;
  platform: DevicePlatform;
}): void {
  window.analytics.track(AnalyticsTrack.FileDownloadStart, payload);
}

export function trackFileDownloadError(payload: {
  file_id: string;
  email: string;
  msg: string;
  platform: DevicePlatform;
}): void {
  window.analytics.track(AnalyticsTrack.FileDownloadError, payload);
}

export function trackFileDownloadFinished(payload: {
  file_id: string;
  file_size: number;
  email: string;
  platform: DevicePlatform;
}): void {
  window.analytics.track(AnalyticsTrack.FileDownloadFinished, payload);
}

export function trackFileUploadStart(payload: {
  file_size: number;
  file_type: string;
  folder_id: number;
  email: string;
  platform: DevicePlatform;
}): void {
  window.analytics.track(AnalyticsTrack.FileUploadStart, payload);
}

export function trackFileUploadError(payload: {
  file_size: number;
  file_type: string;
  folder_id: number;
  email: string;
  msg: string;
  platform: DevicePlatform;
}): void {
  window.analytics.track(AnalyticsTrack.FileUploadError, payload);
}

export function trackFileUploadFinished(payload: {
  file_type: string;
  file_id: number;
  file_size: number;
  email: string;
}): void {
  window.analytics.track(AnalyticsTrack.FileUploadFinished, payload);
}

export function trackMoveItem(
  keyOp: string,
  payload: { email: string; file_id: number; platform: DevicePlatform },
): void {
  window.analytics.track(`${keyOp}-move`.toLowerCase(), payload);
}

export function trackDeleteItem(itemToDelete: any, payload: { email: string; platform: DevicePlatform }): void {
  window.analytics.track(`${itemToDelete.isFolder ? 'folder' : 'file'}-delete`, payload);
}

export function trackOpenWelcomeFile(): void {
  window.analytics.track(AnalyticsTrack.OpenWelcomeFile);
}

export function trackDeleteWelcomeFile(): void {
  window.analytics.track(AnalyticsTrack.DeleteWelcomeFile);
}

export function trackFileShare(): void {
  window.analytics.track(AnalyticsTrack.FileShare);
}

export function identify(user: any, email: string): void {
  window.analytics.identify(user.uuid, {
    email,
    platform: DevicePlatform.Web,
    referrals_credit: user.credit,
    referrals_count: Math.floor(user.credit / 5),
    createdAt: user.createdAt,
  });
}

export function trackUserResetPasswordRequest(): void {
  window.analytics.track(AnalyticsTrack.UserResetPasswordRequest);
}

export function track(email: string, status: 'error' | 'success'): void {
  window.analytics.track('user-change-password', {
    status,
    email,
  });
}

export function trackFileUploadBucketIdUndefined(payload: { email: string; platform: DevicePlatform }): void {
  window.analytics.track(AnalyticsTrack.FileUploadBucketIdUndefined, payload);
}

export function trackShareLinkBucketIdUndefined(payload: { email: string }): void {
  window.analytics.track(AnalyticsTrack.ShareLinkBucketIdUndefined, payload);
}

const analyticsService = {
  page,
  identify,
  identifyUsage,
  identifyPlan,
  trackSignOut,
  trackSignIn,
  trackSignUp,
  trackUserEnterPayments,
  trackPlanSubscriptionSelected,
  trackFolderCreated,
  trackFolderRename,
  trackFileRename,
  trackFileDownloadStart,
  trackFileDownloadError,
  trackFileDownloadFinished,
  trackFileUploadStart,
  trackFileUploadError,
  trackFileUploadFinished,
  trackMoveItem,
  trackDeleteItem,
  trackOpenWelcomeFile,
  trackDeleteWelcomeFile,
  trackFileShare,
  signInAttempted,
  trackUserResetPasswordRequest,
  track,
  trackFileUploadBucketIdUndefined,
};

export default analyticsService;
