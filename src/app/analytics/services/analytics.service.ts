/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as prettySize from 'prettysize';
import httpService from '../../../../src/app/core/services/http.service';
import errorService from 'app/core/services/error.service';

import Analytics from '../Analytics';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import localStorageService from 'app/core/services/local-storage.service';
import { DevicePlatform, SignupDeviceSource } from 'app/core/types';
import { DriveItemData } from 'app/drive/types';
import { AnalyticsTrackNames } from '../types';
import { TrackingPlan } from '../TrackingPlan';
import { v4 as uuidv4 } from 'uuid';
import { getCookie } from '../utils';
import axios from 'axios';
import dayjs from 'dayjs';

const IMPACT_API = process.env.REACT_APP_IMPACT_API as string;

const analytics: Analytics = Analytics.getInstance();
const anonymousID = getCookie('impactAnonymousId');
const source = getCookie('impactSource');

export function getTrackingActionId() {
  return uuidv4();
}

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

export function trackFileUploadStarted(properties: TrackingPlan.UploadProperties): void {
  analytics.track(TrackingPlan.EventNames.FileUploadStart, properties);
}

export function trackFileUploadCompleted(properties: TrackingPlan.UploadCompletedProperties): void {
  analytics.track(TrackingPlan.EventNames.FileUploadCompleted, properties);
}

export function trackFileUploadError(properties: TrackingPlan.UploadErrorProperties): void {
  analytics.track(TrackingPlan.EventNames.FileUploadError, properties);
}

export function trackFileUploadAborted(properties: TrackingPlan.UploadAbortedProperties): void {
  analytics.track(TrackingPlan.EventNames.FileUploadAborted, properties);
}

export function trackFileDownloadStarted(properties: TrackingPlan.DownloadProperties): void {
  analytics.track(TrackingPlan.EventNames.FileDownloadStarted, properties);
}

export function trackFileDownloadCompleted(properties: TrackingPlan.DownloadProperties): void {
  analytics.track(TrackingPlan.EventNames.FileDownloadCompleted, properties);
}

export function trackFileDownloadError(properties: TrackingPlan.DownloadErrorProperties): void {
  analytics.track(TrackingPlan.EventNames.FileDownloadError, properties);
}

export function trackFileDownloadAborted(properties: TrackingPlan.DownloadProperties): void {
  analytics.track(TrackingPlan.EventNames.FileDownloadAborted, properties);
}

export function trackCanceledSubscription(properties: TrackingPlan.CanceledSubscriptionProperties): void {
  analytics.track(TrackingPlan.EventNames.CanceledSubscription, properties);
}

export function trackPublicShared(properties: TrackingPlan.PublicSharedProperties): void {
  analytics.track(TrackingPlan.EventNames.PublicShared, properties);
}

export function trackRestrictedShared(properties: TrackingPlan.RestrictedSharedProperties): void {
  analytics.track(TrackingPlan.EventNames.RestrictedShared, properties);
}

export function trackSharedInvitationsAccepted(properties: TrackingPlan.SharedInvitationsAcceptedProperties): void {
  analytics.track(TrackingPlan.EventNames.SharedInvitationsAccepted, properties);
}

export function trackFilePreviewOpened(properties: TrackingPlan.FilePreviewProperties): void {
  analytics.track(TrackingPlan.EventNames.FilePreviewOpened, properties);
}

export function trackFilePreviewed(properties: TrackingPlan.FilePreviewProperties): void {
  analytics.track(TrackingPlan.EventNames.FilePreviewed, properties);
}

export function trackFilePreviewClicked(properties: TrackingPlan.FilePreviewProperties): void {
  analytics.track(TrackingPlan.EventNames.FilePreviewClicked, properties);
}

export function trackBackupKeyDownloaded(properties: TrackingPlan.BackupKeyDownloadedProperties): void {
  analytics.track(TrackingPlan.EventNames.BackupKeyDownloaded, properties);
}

export function trackPasswordRecovered(properties: TrackingPlan.PasswordRecoveredProperties): void {
  analytics.track(TrackingPlan.EventNames.PasswordRecovered, properties);
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

export function trackSignOut() {
  /* window.analytics.track(AnalyticsTrackNames.SignOut);
  window.analytics.reset(); */
}

export function trackSignIn(payload: { email: string; userId: string }): void {
  // window.analytics.track(AnalyticsTrackNames.SignIn, payload);
}

export function signInAttempted(email: string, error: string | Error): void {
  /* window.analytics.track(AnalyticsTrackNames.SignInAttempted, {
    status: 'error',
    msg: error ? error : 'Login error',
    email: email,
  }); */
}

export async function trackSignUp(uuid, email) {
  try {
    window.rudderanalytics.identify(uuid, { email, uuid: uuid });
    window.rudderanalytics.track('User Signup', { email });
    window.gtag('event', 'User Signup');

    if (source && source !== 'direct') {
      await axios.post(IMPACT_API, {
        anonymousId: anonymousID,
        timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss.sssZ'),
        messageId: uuidv4(),
        userId: uuid,
        type: 'track',
        event: 'User Signup',
      });
    }
  } catch (e) {
    const castedError = errorService.castError(e);
    console.error(castedError);
    errorService.reportError(castedError);
  }
}

export function trackUserEnterPayments(priceId: string): void {
  //  window.analytics.track(AnalyticsTrackNames.UserEnterPayments, { price_id: priceId });
}

export function trackPlanSubscriptionSelected(payload: {
  price: string;
  plan_type: string;
  payment_type: string;
  plan_length: number;
  email: string;
}): void {
  // window.analytics.track(AnalyticsTrackNames.PlanSubscriptionSelected, payload);
}

export function trackFolderCreated(payload: { email: string; platform: DevicePlatform }): void {
  // window.analytics.track(AnalyticsTrackNames.FolderCreated, payload);
}

export function trackFolderRename(payload: { email: string; fileId: number; platform: DevicePlatform }): void {
  // window.analytics.track(AnalyticsTrackNames.FolderRename, payload);
}

export function trackFileRename(payload: { email: string; file_id: number | string; platform: DevicePlatform }): void {
  // window.analytics.track(AnalyticsTrackNames.FileRename, payload);
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
  // window.analytics.track(AnalyticsTrackNames.OpenWelcomeFile);
}

export function trackDeleteWelcomeFile(): void {
  // window.analytics.track(AnalyticsTrackNames.DeleteWelcomeFile);
}

export function trackFileShare(): void {
  // window.analytics.track(AnalyticsTrackNames.FileShare);
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

export function trackUserResetPasswordRequest(): void {
  // window.analytics.track(AnalyticsTrackNames.UserResetPasswordRequest);
}

export function track(reason: string, status?: 'error' | 'success'): void {
  console.log('track');
  window.rudderanalytics.track(reason, { status });
}

export function trackFileUploadBucketIdUndefined(payload: { email: string; platform: DevicePlatform }): void {
  // window.analytics.track(AnalyticsTrackNames.FileUploadBucketIdUndefined, payload);
}

export function trackShareLinkBucketIdUndefined(payload: { email: string }): void {
  // window.analytics.track(AnalyticsTrackNames.ShareLinkBucketIdUndefined, payload);
}

export async function trackCancelPayment(priceId: string) {
  try {
    const checkoutSessionId = localStorage.getItem('sessionId');
    const {
      amount_total,
      id: sessionId,
      customer_email,
    } = (await httpService.get(`${process.env.REACT_APP_API_URL}/api/stripe/session`, {
      params: {
        sessionId: checkoutSessionId,
      },
      headers: httpService.getHeaders(true, false),
    })) as any;

    const amount = amount_total * 0.01;

    window.rudderanalytics.track(AnalyticsTrackNames.CancelPaymentConversionEvent, {
      sessionId: sessionId,
      email: customer_email,
      price: amount,
      priceId: priceId,
    });
  } catch (err) {
    const castedError = errorService.castError(err);
    console.error(castedError);
  }
}

export async function trackPaymentConversion() {
  try {
    const checkoutSessionId = localStorage.getItem('sessionId');
    const { metadata, amount_total, currency, customer, subscription, payment_intent } = (await httpService.get(
      `${process.env.REACT_APP_API_URL}/api/stripe/session`,
      {
        params: {
          sessionId: checkoutSessionId,
        },
        headers: httpService.getHeaders(true, false),
      },
    )) as any;
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
    window.rudderanalytics.track(AnalyticsTrackNames.PaymentConversionEvent, {
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

    window.gtag('event', 'purchase', {
      transaction_id: uuidv4(),
      value: amount,
      currency: currency.toUpperCase(),
      items: [
        {
          item_id: metadata.priceId,
          item_name: metadata.name,
          quantity: 1,
          price: amount,
        },
      ],
    });

    if (source && source !== 'direct') {
      axios
        .post(IMPACT_API, {
          anonymousId: anonymousID,
          timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss.sssZ'),
          properties: {
            impact_value: amount_total === 0 ? 5 : amount,
            subscription_id: subscription,
            payment_intent,
          },
          userId: uuid,
          type: 'track',
          event: 'Payment Conversion',
        })
        .catch((err) => {
          const error = errorService.castError(err);
          errorService.reportError(error);
        });
    }
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
  trackSignOut,
  trackSignIn,
  trackSignUp,
  trackUserEnterPayments,
  trackPlanSubscriptionSelected,
  trackFolderCreated,
  trackFolderRename,
  trackFileRename,
  trackFileDownloadStarted,
  trackFileDownloadCompleted,
  trackFileDownloadError,
  trackFileDownloadAborted,
  trackFileUploadStarted,
  trackFileUploadCompleted,
  trackFileUploadAborted,
  trackFileUploadError,
  trackMoveItem,
  trackDeleteItem,
  trackOpenWelcomeFile,
  trackDeleteWelcomeFile,
  trackFileShare,
  signInAttempted,
  trackUserResetPasswordRequest,
  track,
  trackFileUploadBucketIdUndefined,
  trackPaymentConversion,
  getTrackingActionId,
  trackCancelPayment,
};

export default analyticsService;
