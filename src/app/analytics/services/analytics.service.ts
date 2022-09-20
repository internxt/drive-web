/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { PreferencesTabID } from 'app/core/views/Preferences';
import {
  AnalyticsTrackActions,
  AnalyticsTrackUI,
  IdentifyObject,
  AnalyticsPayloads,
  AnalyticsPages
} from '../types';


const getAnalytics = () => {
  return window?.rudderanalytics;
};

const trackPage = (pageName: string) => {
  const analytics = getAnalytics();
  analytics?.page(pageName);
};

const track = (payload: AnalyticsPayloads['Track']) => {
  const analytics = getAnalytics();
  analytics?.track(payload.trackString, payload.trackData);
};

const identify = (payload: AnalyticsPayloads['Identify']) => {
  const analytics = getAnalytics();
  const user = payload?.user;
  let identifyObject = { email: user?.email, uuid: user?.uuid } as IdentifyObject;
  if (payload.logout) {
    identifyObject = { email: user?.email, uuid: user?.uuid, is_logged_in: false };
  }
  analytics?.identify(user?.uuid, identifyObject);
};

const trackPageBackups = () => {
  trackPage(AnalyticsPages.backups);
};

const trackPageMain = () => {
  trackPage(AnalyticsPages.main);
};

const trackPagePhotos = () => {
  trackPage(AnalyticsPages.photos);
};

const trackPageSharedLinks = () => {
  trackPage(AnalyticsPages.sharedLinks);
};

const trackPageRecents = () => {
  trackPage(AnalyticsPages.recents);
};

const trackPagePreferencesTabs = (tab: PreferencesTabID) => {
  trackPage(AnalyticsPages[tab]);
};


const trackSignIn = (user: UserSettings) => {
  track({ trackString: AnalyticsTrackActions.SignIn, trackData: { email: user.email } });
};

const trackSignUp = (user: UserSettings) => {
  track({ trackString: AnalyticsTrackActions.SignUp, trackData: { email: user.email } });
};

const trackLogOut = (user: UserSettings) => {
  track({ trackString: AnalyticsTrackActions.LogOut, trackData: { email: user.email } });
};

const trackClickedDriveUploadButton = () => {
  track({
    trackString: AnalyticsTrackActions.ClickedDriveUploadButton,
    trackData: { ui_element: AnalyticsTrackUI.ClickedDriveUploadButtonUI }
  });
};

const trackClickedDriveNewFolderButton = () => {
  track({
    trackString: AnalyticsTrackActions.ClickedDriveNewFolder,
    trackData: { ui_element: AnalyticsTrackUI.ClickedDriveNewFolderUI }
  });
};

const trackClickedDriveChangeViewButton = (view: string) => {
  const clicked = view === 'mosaic' ? AnalyticsTrackActions.ClickedDriveChangeViewMosaic : AnalyticsTrackActions.ClickedDriveChangeViewList;
  track({ trackString: clicked });
};

const trackFileUploadStarted = (payload: AnalyticsPayloads['FileUpload']) => {
  track({
    trackString: AnalyticsTrackActions.FileUploadStarted,
    trackData: {
      size: payload.size,
      type: payload.type
    }
  });
};

const trackFileUploadCompleted = (payload: AnalyticsPayloads['FileUpload']) => {
  track({
    trackString: AnalyticsTrackActions.FileUploadCompleted,
    trackData: {
      size: payload.size,
      type: payload.type,
      file_id: payload.file_id,
      parent_folder_id: payload.parent_folder_id
    }
  });
};

const trackFileUploadCanceled = (payload: AnalyticsPayloads['FileUpload']) => {
  track({
    trackString: AnalyticsTrackActions.FileUploadCanceled,
    trackData: {
      size: payload.size,
      type: payload.type
    }
  });
};

const trackFileUploadError = (payload: AnalyticsPayloads['FileUpload']) => {
  track({
    trackString: AnalyticsTrackActions.FileUploadError,
    trackData: {
      message: payload.messageError,
      size: payload.size,
      type: payload.type
    }
  });
};

const trackClickedDriveMainDownloadButton = (payload: AnalyticsPayloads['DriveItem']) => {
  track({
    trackString: AnalyticsTrackActions.ClickedDriveDownloadButton,
    trackData: {
      is_multiselection: payload.is_multiselection,
      size: payload.size,
      type: payload.type,
      is_folder: payload.is_folder,
      ui_element: AnalyticsTrackUI.ClickedDriveDownloadButtonMainUI
    }
  });
};

const trackClickedDriveActionsDownloadButton = (payload: AnalyticsPayloads['DriveItem']) => {
  track({
    trackString: AnalyticsTrackActions.ClickedDriveDownloadButton,
    trackData: {
      is_multiselection: payload.is_multiselection,
      size: payload.size,
      type: payload.type,
      is_folder: payload.is_folder,
      ui_element: AnalyticsTrackUI.ClickedDriveActionsUI
    }
  });
};

const trackClickedDriveActionsRenameButton = (is_folder: boolean) => {
  track({
    trackString: AnalyticsTrackActions.ClickedDriveActionsRenameButton,
    trackData: {
      is_folder,
      ui_element: AnalyticsTrackUI.ClickedDriveActionsUI
    }
  });
};

const trackClickedDriveActionsShareButton = (is_folder: boolean) => {
  track({
    trackString: AnalyticsTrackActions.ClickedDriveActionsShareButton,
    trackData: {
      is_folder,
      ui_element: AnalyticsTrackUI.ClickedDriveActionsUI
    }
  });
};

const trackClickedDriveActionsInfoButton = (is_folder: boolean) => {
  track({
    trackString: AnalyticsTrackActions.ClickedDriveActionsInfoButton,
    trackData: {
      is_folder,
      ui_element: AnalyticsTrackUI.ClickedDriveActionsUI
    }
  });
};

const trackClickedDriveActionsDeleteButton = (is_folder: boolean) => {
  track({
    trackString: AnalyticsTrackActions.ClickedDriveDeleteButton,
    trackData: {
      is_folder,
      ui_element: AnalyticsTrackUI.ClickedDriveActionsUI
    }
  });
};

const trackClickedDriveMainDeleteButton = (payload: AnalyticsPayloads['DriveItem']) => {
  track({
    trackString: AnalyticsTrackActions.ClickedDriveDeleteButton,
    trackData: {
      is_multiselection: payload.is_multiselection,
      size: payload.size,
      type: payload.type,
      is_folder: payload.is_folder,
      ui_element: AnalyticsTrackUI.ClickedDriveDeleteButtonMainUI
    }
  });
};

const trackClickedSidenavUpgradeButton = () => {
  track({
    trackString: AnalyticsTrackActions.ClickedSidenavUpgradeButton,
    trackData: { ui_element: AnalyticsTrackUI.ClickedSidenavUI }
  });
};

const trackClickedSidenavDownloadDesktopAppButton = () => {
  track({
    trackString: AnalyticsTrackActions.ClickedSidenavDownloadDesktopAppButton,
    trackData: { ui_element: AnalyticsTrackUI.ClickedSidenavUI }
  });
};

const trackClickedNavbarSettingsButton = () => {
  track({
    trackString: AnalyticsTrackActions.ClickedNavbarSettingsButton,
    trackData: { ui_element: AnalyticsTrackUI.ClickedNavbarUI }
  });
};

const trackClickedNavbarAvatarButton = () => {
  track({
    trackString: AnalyticsTrackActions.ClickedNavbarAvatarButton,
    trackData: { ui_element: AnalyticsTrackUI.ClickedNavbarUI }
  });
};

const trackClickedAvatarDropDownUpgradeButton = () => {
  track({
    trackString: AnalyticsTrackActions.ClickedAvatarDropDownUpgradeButton,
    trackData: { ui_element: AnalyticsTrackUI.ClickedAvatarDropDownUI }
  });
};

const trackClickedAvatarDropDownDownloadDesktopAppButton = () => {
  track({
    trackString: AnalyticsTrackActions.ClickedAvatarDropDownDownloadDesktopAppButton,
    trackData: { ui_element: AnalyticsTrackUI.ClickedAvatarDropDownUI }
  });
};


export function signupCampaignSource(locationSearch: string) {
  const parameters = new URLSearchParams(locationSearch);
  const partner = parameters.get('internxt_partner');
  const campaign = parameters.get('utm_campaign');
  const impact = parameters.get('irclickid') ? 'impact' : null;
  const other = 'organic';

  const source = [partner, campaign, impact, other].find((o) => typeof o !== 'undefined' && o !== null);

  return source;
}


const analyticsService = {
  trackPage,
  track,
  identify,
  trackPageBackups,
  trackPageMain,
  trackPagePhotos,
  trackPageSharedLinks,
  trackPageRecents,
  trackPagePreferencesTabs,
  trackSignIn,
  trackSignUp,
  trackLogOut,
  trackClickedDriveUploadButton,
  trackClickedDriveNewFolderButton,
  trackClickedDriveChangeViewButton,
  trackFileUploadStarted,
  trackFileUploadCompleted,
  trackFileUploadCanceled,
  trackFileUploadError,
  trackClickedDriveMainDownloadButton,
  trackClickedDriveActionsDownloadButton,
  trackClickedDriveActionsRenameButton,
  trackClickedDriveActionsShareButton,
  trackClickedDriveActionsInfoButton,
  trackClickedDriveActionsDeleteButton,
  trackClickedDriveMainDeleteButton,
  trackClickedSidenavUpgradeButton,
  trackClickedSidenavDownloadDesktopAppButton,
  trackClickedNavbarSettingsButton,
  trackClickedNavbarAvatarButton,
  trackClickedAvatarDropDownUpgradeButton,
  trackClickedAvatarDropDownDownloadDesktopAppButton,
};

export default analyticsService;
