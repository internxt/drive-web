/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as prettySize from 'prettysize';
import httpService from '../../../../src/app/core/services/http.service';
import errorService from 'app/core/services/error.service';

import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import localStorageService from 'app/core/services/local-storage.service';
import { DevicePlatform, SignupDeviceSource } from 'app/core/types';
import { DriveItemData } from 'app/drive/types';
import { AnalyticsTrack, RudderAnalyticsTrack } from '../types';
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
  '/app': 'App'
};


const rudderTrackPage = (pageName: string) => {
  window.rudderanalytics.page(pageName);
};

const rudderTrack = (trackString: string, trackData?) => {
  window.rudderanalytics.track(trackString, trackData);
};

const rudderIdentify = (user: UserSettings) => {
  window.rudderanalytics.identify(user.uuid, { email: user.email, uuid: user.uuid });
};


const rudderTrackSignIn = (email: string) => {
  rudderTrack(RudderAnalyticsTrack.SignIn, { email });
};

const rudderTrackSignUp = (email: string) => {
  rudderTrack(RudderAnalyticsTrack.SignUp, { email });
};

const rudderTrackClickedDriveUploadButton = () => {
  rudderTrack(RudderAnalyticsTrack.ClickedDriveUploadButton, { ui_element: RudderAnalyticsTrack.ClickedDriveUploadButtonUI });
};

const rudderTrackClickedDriveNewFolderButton = () => {
  rudderTrack(RudderAnalyticsTrack.ClickedDriveNewFolder, { ui_element: RudderAnalyticsTrack.ClickedDriveNewFolderUI });
};

const rudderTrackClickedDriveChangeViewButton = (view: string) => {
  const clicked = view === 'mosaic' ? RudderAnalyticsTrack.ClickedDriveChangeViewMosaic : RudderAnalyticsTrack.ClickedDriveChangeViewList;
  rudderTrack(clicked);
};

const rudderTrackFileUploadStarted = (size: number, type: string) => {
  rudderTrack(RudderAnalyticsTrack.FileUploadStarted, { size, type });
};

const rudderTrackFileUploadCompleted = (size: number, type: string, file_id, parent_folder_id) => {
  rudderTrack(RudderAnalyticsTrack.FileUploadCompleted, { size, type, file_id, parent_folder_id });
};

const rudderTrackFileUploadCanceled = (size: number, type: string) => {
  rudderTrack(RudderAnalyticsTrack.FileUploadCanceled, { size, type });
};

const rudderTrackFileUploadError = (message: string, size: number, type: string) => {
  rudderTrack(RudderAnalyticsTrack.FileUploadError, { message, size, type });
};

const rudderTrackClickedDriveMainDownloadButton = (is_multiselection: boolean, size?: number, type?: string, is_folder?: boolean) => {
  rudderTrack(RudderAnalyticsTrack.ClickedDriveDownloadButton, {
    is_multiselection, size, type, is_folder,
    ui_element: RudderAnalyticsTrack.ClickedDriveDownloadButtonMainUI
  });
};

const rudderTrackClickedDriveActionsDownloadButton = (is_multiselection: boolean, size: number, type: string, is_folder: boolean) => {
  rudderTrack(RudderAnalyticsTrack.ClickedDriveDownloadButton, {
    is_multiselection, size, type, is_folder,
    ui_element: RudderAnalyticsTrack.ClickedDriveActionsUI
  });
};

const rudderTrackClickedDriveActionsRenameButton = (is_folder: boolean) => {
  rudderTrack(RudderAnalyticsTrack.ClickedDriveActionsRenameButton, { is_folder, ui_element: RudderAnalyticsTrack.ClickedDriveActionsUI });
};

const rudderTrackClickedDriveActionsShareButton = (is_folder: boolean) => {
  rudderTrack(RudderAnalyticsTrack.ClickedDriveActionsShareButton, { is_folder, ui_element: RudderAnalyticsTrack.ClickedDriveActionsUI });
};

const rudderTrackClickedDriveActionsInfoButton = (is_folder: boolean) => {
  rudderTrack(RudderAnalyticsTrack.ClickedDriveActionsInfoButton, { is_folder, ui_element: RudderAnalyticsTrack.ClickedDriveActionsUI });
};

const rudderTrackClickedDriveActionsDeleteButton = (is_folder: boolean) => {
  rudderTrack(RudderAnalyticsTrack.ClickedDriveDeleteButton, { is_folder, ui_element: RudderAnalyticsTrack.ClickedDriveActionsUI });
};

const rudderTrackClickedDriveMainDeleteButton = (is_multiselection: boolean, size?: number, type?: string, is_folder?: boolean) => {
  rudderTrack(RudderAnalyticsTrack.ClickedDriveDeleteButton, {
    is_multiselection, size, type, is_folder,
    ui_element: RudderAnalyticsTrack.ClickedDriveDeleteButtonMainUI
  });
};

const rudderTrackClickedSidenavUpgradeButton = () => {
  rudderTrack(RudderAnalyticsTrack.ClickedSidenavUpgradeButton, { ui_element: RudderAnalyticsTrack.ClickedSidenavElement });
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
  /* window.analytics.track(AnalyticsTrack.SignOut);
  window.analytics.reset(); */
}

export function trackSignIn(payload: { email: string; userId: string }): void {
  // window.analytics.track(AnalyticsTrack.SignIn, payload);
}

export function signInAttempted(email: string, error: string | Error): void {
  /* window.analytics.track(AnalyticsTrack.SignInAttempted, {
    status: 'error',
    msg: error ? error : 'Login error',
    email: email,
  }); */
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
  /* window.analytics.identify(payload.userId, payload.traits);
  window.analytics.track(AnalyticsTrack.SignUp, payload.properties); */
  trackSignUpServer(payload);
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

export function trackFileUploadStart(payload: {
  file_size: number;
  file_type: string;
  folder_id: number;
  email: string;
  platform: DevicePlatform;
}): void {
  // window.analytics.track(AnalyticsTrack.FileUploadStart, payload);
}

export function trackFileUploadError(payload: {
  file_size: number;
  file_type: string;
  folder_id: number;
  email: string;
  msg: string;
  platform: DevicePlatform;
}): void {
  // window.analytics.track(AnalyticsTrack.FileUploadError, payload);
}

export function trackFileUploadFinished(payload: {
  file_type: string;
  file_id: number;
  file_size: number;
  email: string;
}): void {
  // window.analytics.track(AnalyticsTrack.FileUploadFinished, payload);
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

export function trackUserResetPasswordRequest(): void {
  // window.analytics.track(AnalyticsTrack.UserResetPasswordRequest);
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
    const queryStringParsed = queryString.parse(location.search);
    const checkoutSessionId = String(queryStringParsed.cs_id);
    const { metadata, amount_total, currency, customer, subscription, payment_intent } = await httpService.get(
      `${process.env.REACT_APP_API_URL}/api/stripe/session`, {
      params: {
        sessionId: checkoutSessionId
      }
    });
    const { username, uuid } = getUser();
    const amount = amount_total * 0.01;

    /* window.analytics.identify(
      uuid,
      {
        email: username,
        plan: metadata.priceId,
        customer_id: customer,
        storage_limit: metadata.maxSpaceBytes,
        plan_name: metadata.name,
        subscription_id: subscription,
        payment_intent
      }
    );
    window.analytics.track(
      AnalyticsTrack.PaymentConversionEvent,
      {
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
      }
    ); */
  }
  catch (err) {
    const castedError = errorService.castError(err);
    /* window.analytics.track('Error Signup After Payment Conversion', {
      message: castedError.message || '',
    }); */
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
  return httpService.post(`${process.env.REACT_APP_API_URL}/api/data/p`,
    {
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
  return httpService.post(`${process.env.REACT_APP_API_URL}/api/data/t`,
    {
      page,
      track: payload,
      actionName: 'server_signup'
    }
  ).catch(() => {
    // No op
  });
}


const analyticsService = {
  rudderTrackPage,
  rudderTrack,
  rudderIdentify,
  rudderTrackSignIn,
  rudderTrackSignUp,
  rudderTrackClickedDriveUploadButton,
  rudderTrackClickedDriveNewFolderButton,
  rudderTrackClickedDriveChangeViewButton,
  rudderTrackFileUploadStarted,
  rudderTrackFileUploadCompleted,
  rudderTrackFileUploadCanceled,
  rudderTrackFileUploadError,
  rudderTrackClickedDriveMainDownloadButton,
  rudderTrackClickedDriveActionsDownloadButton,
  rudderTrackClickedDriveActionsRenameButton,
  rudderTrackClickedDriveActionsShareButton,
  rudderTrackClickedDriveActionsInfoButton,
  rudderTrackClickedDriveActionsDeleteButton,
  rudderTrackClickedDriveMainDeleteButton,
  rudderTrackClickedSidenavUpgradeButton,
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
  trackFileDownloadCompleted,
  trackPaymentConversion,
};

export default analyticsService;
