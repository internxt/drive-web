import * as prettySize from 'prettysize';
import { AnalyticsTrack, DevicePlatform, SignupDeviceSource } from '../models/enums';
import { DriveItemData, UserSettings } from '../models/interfaces';
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

export function signupDevicesource(userAgent: string): string {
  for (const device in SignupDeviceSource) {
    if (new RegExp(device).test(userAgent)) {
      return device;
    }
  }
  return SignupDeviceSource.Other;
}

export function signupCampaignSource(locationSearch: string) {
  const parameters = new URLSearchParams(locationSearch);
  const partner = parameters.get('internxt_partner');
  const campaign = parameters.get('utm_campaign');
  const impact = parameters.get('irclickid') ? 'impact' : null;
  const other = 'organic';

  const source = [partner, campaign, impact, other].find((o) => typeof o !== 'undefined' && o !== null);

  return source;
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
    email: getUser()?.email,
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

export function trackSignUp(payload: {
  properties: { signup_source; email: string };
  traits: {
    member_tier?: string;
    email: string;
    first_name: string;
    last_name: string;
    usage: number;
    createdAt: string;
    signup_device_source: string;
    acquisition_channel;
  };
  userId: string;
}): void {
  window.analytics.identify(payload.userId, payload.traits);
  window.analytics.track(AnalyticsTrack.SignUp, payload.properties);
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

export function trackDeleteItem(
  itemToDelete: DriveItemData,
  payload: { email: string; platform: DevicePlatform },
): void {
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

export function identify(user: UserSettings, email: string): void {
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
