/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as prettySize from 'prettysize';
import httpService from '../../../../src/app/core/services/http.service';
import errorService from 'app/core/services/error.service';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import localStorageService from 'app/core/services/local-storage.service';
import { DevicePlatform, SignupDeviceSource } from 'app/core/types';
import { DriveItemData } from 'app/drive/types';
import { AnalyticsTrack } from '../types';
import { getCookie, setCookie } from '../utils';
import queryString from 'query-string';
import { v4 as uuidv4 } from 'uuid';

export const PATH_NAMES = {
  '/new': 'Register',
  '/appsumo': 'Register',
  '/login': 'Login',
  '/storage': 'Drive Main',
  '/settings': 'Settings',
  '/invite': 'Invite',
  '/remove': 'Remove Account',
  '/app': 'App',
};

export function trackFileDownloadCompleted(properties): void {
  trackData(properties, 'file_downloaded');
}

function trackData(properties, actionName) {
  const user = localStorageService.getUser();
  httpService.post(`${process.env.REACT_APP_API_URL}/api/data`, {
    actionName,
    user,
    properties,
  });
}

const payload = {
  usage: 0,
  limit: 0,
  plan: 0,
};

export function page(pageName: string): void {
  window.rudderanalytics.page(pageName);
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
    // window.analytics.identify(getUser().uuid, { userId: getUser().uuid, storage: newValue, platform: 'web' });
  }
}

export function identifyPlan(newValue: number) {
  if (newValue !== payload.plan) {
    payload.plan = newValue;
    /* window.analytics.identify(getUser().uuid, {
      userId: getUser().uuid,
      plan: identifyPlanName(newValue),
      platform: 'web',
    }); */
  }
}

export function rudderanalyticsSignOut() {
  window.rudderanalytics.track('User Logout');
}

export function rudderanalyticsSignIn(uuid: string, email: string): void {
  window.rudderanalytics.identify(uuid, { email: email, uuid: uuid }, () => {
    console.log('Identify callback'); //For debugging
    window.rudderanalytics.track('User Signin', { email: email });
  });
}

export function rudderanalyticsSignInError(email: string, error: string | Error): void {
  window.rudderanalytics.track('User Signin Failed', {
    message: error ? error : 'Login error',
    email: email,
  });
}

export function rudderanalyticsSignUp(email: string, uuid: string): void {
  window.rudderanalytics.identify(uuid, { email, uuid: uuid }, () => {
    window.rudderanalytics.track('User Signup', { email });
  });
}

export function rudderanalyticsSignUpError(email: string, error: string): void {
  window.rudderanalytics.track('User Signup Failed', { email: email, error: error });
}

export function trackUserEnterPayments(priceId: string): void {
  //  window.analytics.track(AnalyticsTrack.UserEnterPayments, { price_id: priceId });
}

export function trackPlanSubscriptionSelected(payload: {
  price: string;
  plan_type: string;
  payment_type: string;
  plan_length: number;
  email: string;
}): void {
  // window.analytics.track(AnalyticsTrack.PlanSubscriptionSelected, payload);
}

export function trackFolderCreated(payload: { email: string; platform: DevicePlatform }): void {
  // window.analytics.track(AnalyticsTrack.FolderCreated, payload);
}

export function trackFolderRename(payload: { email: string; fileId: number; platform: DevicePlatform }): void {
  // window.analytics.track(AnalyticsTrack.FolderRename, payload);
}

export function trackFileRename(payload: { email: string; file_id: number | string; platform: DevicePlatform }): void {
  // window.analytics.track(AnalyticsTrack.FileRename, payload);
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
  // window.analytics.track(AnalyticsTrack.FileDownloadStart, payload);
}

export function trackFileDownloadError(payload: {
  file_id: string;
  email: string;
  msg: string;
  platform: DevicePlatform;
}): void {
  // window.analytics.track(AnalyticsTrack.FileDownloadError, payload);
}

export function trackFileDownloadFinished(payload: {
  file_id: string;
  file_size: number;
  email: string;
  platform: DevicePlatform;
}): void {
  // window.analytics.track(AnalyticsTrack.FileDownloadFinished, payload);
}

export function rudderanalyticsFileUploadStarted(type: string, size: number): void {
  window.rudderanalytics.track('File Upload Started', {
    type: type,
    size: size,
  });
}

export function rudderanalyticsFileUploadError(error, type, size): void {
  window.rudderanalytics.track('File Upload Error', {
    message: error,
    size: size,
    type: type,
  });
}

export function rudderanalyticsFileUploadCompleted(type, size, parentFolderId, fileId): void {
  window.rudderanalytics.track('File Upload Completed', {
    type: type,
    size: size,
    parent_folder_id: parentFolderId,
    file_id: fileId,
  });
}

export function trackMoveItem(
  keyOp: string,
  payload: { email: string; file_id: number; platform: DevicePlatform },
): void {
  // window.analytics.track(`${keyOp}-move`.toLowerCase(), payload);
}

export function trackDeleteItem(
  itemToDelete: DriveItemData,
  payload: { email: string; platform: DevicePlatform },
): void {
  // window.analytics.track(`${itemToDelete.isFolder ? 'folder' : 'file'}-delete`, payload);
}

export function trackOpenWelcomeFile(): void {
  // window.analytics.track(AnalyticsTrack.OpenWelcomeFile);
}

export function trackDeleteWelcomeFile(): void {
  // window.analytics.track(AnalyticsTrack.DeleteWelcomeFile);
}

export function trackFileShare(): void {
  // window.analytics.track(AnalyticsTrack.FileShare);
}

export function identify(user: UserSettings, email: string): void {
  /* window.analytics.identify(user.uuid, {
    email,
    platform: DevicePlatform.Web,
    referrals_credit: user.credit,
    referrals_count: Math.floor(user.credit / 5),
    createdAt: user.createdAt,
  }); */
}

export function rudderanalyticsForgotPassword(email: string): void {
  window.rudderanalytics.track('Forgot password clicked', { email: email || 'No email provided' });
}

export function track(email: string, status: 'error' | 'success'): void {
  /* window.analytics.track('Password Changed', {
    status,
    email,
  }); */
}

export function trackFileUploadBucketIdUndefined(payload: { email: string; platform: DevicePlatform }): void {
  // window.analytics.track(AnalyticsTrack.FileUploadBucketIdUndefined, payload);
}

export function trackShareLinkBucketIdUndefined(payload: { email: string }): void {
  // window.analytics.track(AnalyticsTrack.ShareLinkBucketIdUndefined, payload);
}

export async function trackPaymentConversion() {
  try {
    // window.analytics.page('Checkout Success');
    const checkoutSessionId = localStorage.getItem('sessionId');
    const { metadata, amount_total, currency, customer, subscription, payment_intent } = await httpService.get<any>(
      `${process.env.REACT_APP_API_URL}/api/stripe/session`,
      {
        params: {
          sessionId: checkoutSessionId,
        },
        headers: httpService.getHeaders(true, false),
      },
    );
    const { username, uuid } = getUser();
    const amount = amount_total * 0.01;

    window.rudderanalytics.identify(uuid, {
      email: username,
      plan: metadata.priceId,
      customer_id: customer,
      storage_limit: metadata.maxSpaceBytes,
      plan_name: metadata.name,
      subscription_id: subscription,
      payment_intent,
    });
    window.rudderanalytics.track(AnalyticsTrack.PaymentConversionEvent, {
      price_id: metadata.priceId,
      product: metadata.product,
      email: username,
      customer_id: customer,
      currency: currency.toUpperCase(),
      value: amount,
      revenue: amount,
      quantity: 1,
      type: metadata.type,
      plan_name: metadata.name,
      impact_value: amount_total === 0 ? 5 : amount,
      subscription_id: subscription,
      payment_intent,
    });
  } catch (err) {
    const castedError = errorService.castError(err);
    window.rudderanalytics.track('Error Signup After Payment Conversion', {
      message: castedError.message || '',
    });
  }
}

async function getBodyPage(segmentName?: string) {
  /* const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const brave = navigator.brave && await navigator.brave.isBrave();
  const browser = brave ? 'brave' : navigator.userAgent;
  let userId = null;
  let anonymousId = uuidv4();;
  try {
    anonymousId = JSON.parse(window.localStorage.getItem('ajs_anonymous_id') || '');
    userId = JSON.parse(window.localStorage.getItem('ajs_user_id') || '');
  }
  catch (err) {
    anonymousId = getCookie('anonymousId') || anonymousId;
    userId = null;
    setCookie('anonymousId', anonymousId, 50);
  }
  return {
    anonymousId,
    userId,
    context: {
      campaign: {
        source: urlParams.get('utm_source'),
        id: urlParams.get('utm_id'),
        medium: urlParams.get('utm_medium'),
        term: urlParams.get('utm_term'),
        content: urlParams.get('utm_content'),
        name: urlParams.get('utm_name'),
        irclickid: urlParams.get('irclickid')
      },
      userAgent: navigator.userAgent,
      browser,
      locale: window.navigator.language
    },
    name: segmentName,
    properties: {
      path: window.location.pathname,
      referrer: document.referrer,
      search: window.location.search,
      url: document.URL,
    }
  }; */
}

export async function serverPage(segmentName: string) {
  const page = await getBodyPage(segmentName);
  return httpService
    .post(`${process.env.REACT_APP_API_URL}/api/data/p`, {
      page,
    })
    .catch(() => {
      // no op
    });
}

export async function trackSignUpServer(payload: {
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
}) {
  const page = await getBodyPage();
  return httpService
    .post(`${process.env.REACT_APP_API_URL}/api/data/t`, {
      page,
      track: payload,
      actionName: 'server_signup',
    })
    .catch(() => {
      // No op
    });
}

const analyticsService = {
  page,
  identify,
  identifyUsage,
  identifyPlan,
  rudderanalyticsSignIn,
  rudderanalyticsSignOut,
  rudderanalyticsSignUp,
  rudderanalyticsSignUpError,
  trackUserEnterPayments,
  trackPlanSubscriptionSelected,
  trackFolderCreated,
  trackFolderRename,
  trackFileRename,
  trackFileDownloadStart,
  trackFileDownloadError,
  trackFileDownloadFinished,
  rudderanalyticsFileUploadStarted,
  rudderanalyticsFileUploadError,
  rudderanalyticsFileUploadCompleted,
  trackMoveItem,
  trackDeleteItem,
  trackOpenWelcomeFile,
  trackDeleteWelcomeFile,
  trackFileShare,
  rudderanalyticsSignInError,
  rudderanalyticsForgotPassword,
  track,
  trackFileUploadBucketIdUndefined,
  trackFileDownloadCompleted,
  trackPaymentConversion,
};

export default analyticsService;
