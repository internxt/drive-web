import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

export enum AnalyticsTrackActions {
  SignUp = 'User Signup',
  SignIn = 'User Signin',
  LogOut = 'User Logout',
  ClickedDriveUploadButton = 'Upload Button Clicked',
  ClickedDriveNewFolder = 'Create Folder Clicked',
  ClickedDriveDownloadButton = 'Download Button Clicked',
  ClickedDriveChangeViewMosaic = 'Mosaic View Toggled',
  ClickedDriveChangeViewList = 'List View Toggled',
  ClickedDriveActionsRenameButton = 'Rename Clicked',
  ClickedDriveActionsShareButton = 'Share Clicked',
  ClickedDriveActionsInfoButton = 'Info Clicked',
  ClickedDriveDeleteButton = 'Delete Clicked',
  FileUploadStarted = 'File Upload Started',
  FileUploadCompleted = 'File Upload Completed',
  FileUploadCanceled = 'File Upload Canceled',
  FileUploadError = 'File Upload Error',
  ClickedSidenavUpgradeButton = 'Upgrade Button Clicked',
  ClickedSidenavDownloadDesktopAppButton = 'Download Desktop App',
  ClickedNavbarSettingsButton = 'Settings Button Clicked',
  ClickedNavbarAvatarButton = 'Avatar Button Clicked',
  ClickedAvatarDropDownUpgradeButton = 'Upgrade Button Clicked',
  ClickedAvatarDropDownDownloadDesktopAppButton = 'Download Desktop App',
}

export enum AnalyticsTrackUI {
  ClickedDriveUploadButtonUI = 'main_upload_button',
  ClickedDriveNewFolderUI = 'main_create_folder_button',
  ClickedDriveDownloadButtonMainUI = 'main_download_button',
  ClickedDriveActionsUI = 'actions_menu',
  ClickedDriveDeleteButtonMainUI = 'main_delete_button',
  ClickedSidenavUI = 'sidenav',
  ClickedNavbarUI = 'top_bar',
  ClickedAvatarDropDownUI = 'avatar_drop_down_menu',
}

export enum AnalyticsPages {
  backups = 'Backups',
  main = 'Drive Web Main',
  photos = 'Photos',
  sharedLinks = 'Shared Links',
  recents = 'Recents',
  account = 'Account',
  billing = 'Billing',
  plans = 'Plans',
  security = 'Security'
};

export interface AnalyticsPayloads {
  Track: { trackString: string, trackData?},
  Identify: { user: UserSettings, logout?: boolean },
  FileUpload: { size: number, type: string, file_id?: string, parent_folder_id?: number, messageError?: string },
  DriveItem: { is_multiselection: boolean, size?: number, type?: string, is_folder?: boolean }
}


export interface IdentifyObject {
  email: string,
  uuid: string,
  is_logged_in?: boolean
}
