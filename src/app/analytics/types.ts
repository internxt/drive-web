export enum AnalyticsTrack {
  SignOut = 'User SignOut',
  SignIn = 'user-signin',
  SignInAttempted = 'user-signin-attempted',
  SignUp = 'User Signup',
  UserEnterPayments = 'Checkout Opened',
  PlanSubscriptionSelected = 'plan-subscription-selected',
  FolderCreated = 'folder-created',
  FolderRename = 'folder-rename',
  FileRename = 'file-rename',
  FileDownloadStart = 'file-download-start',
  FileDownloadError = 'file-download-error',
  FileDownloadFinished = 'file-download-finished',
  FileUploadStart = 'file-upload-start',
  FileUploadError = 'file-upload-error',
  FileUploadFinished = 'file-upload-finished',
  OpenWelcomeFile = 'file-welcome-open',
  DeleteWelcomeFile = 'file-welcome-delete',
  FileShare = 'file-share',
  UserResetPasswordRequest = 'user-reset-password-request',
  FileUploadBucketIdUndefined = 'file-upload-bucketid-undefined',
  ShareLinkBucketIdUndefined = 'share-link-bucketid-undefined',
  PaymentConversionEvent = 'Payment Conversion'
}

export enum RudderAnalyticsTrack {
  SignUp = 'User Signup',
  SignIn = 'User Signin',
  LogOut = 'User Logout',
  ClickedDriveUploadButton = 'Upload Button Clicked',
  ClickedDriveUploadButtonUI = 'main_upload_button',
  ClickedDriveNewFolder = 'Create Folder Clicked',
  ClickedDriveNewFolderUI = 'main_create_folder_button',
  ClickedDriveDownloadButton = 'Download Button Clicked',
  ClickedDriveDownloadButtonMainUI = 'main_download_button',
  ClickedDriveActionsUI = 'actions_menu',
  ClickedDriveChangeViewMosaic = 'Mosaic View Toggled',
  ClickedDriveChangeViewList = 'List View Toggled',
  ClickedDriveActionsRenameButton = 'Rename Clicked',
  ClickedDriveActionsShareButton = 'Share Clicked',
  ClickedDriveActionsInfoButton = 'Info Clicked',
  ClickedDriveDeleteButton = 'Delete Clicked',
  ClickedDriveDeleteButtonMainUI = 'main_delete_button',
  FileUploadStarted = 'File Upload Started',
  FileUploadCompleted = 'File Upload Completed',
  FileUploadCanceled = 'File Upload Canceled',
  FileUploadError = 'File Upload Error',
  ClickedSidenavElement = 'sidenav',
  ClickedSidenavUpgradeButton = 'Upgrade Button Clicked',
  ClickedSidenavDownloadDesktopAppButton = 'Download Desktop App',
  ClickedNavbarElement = 'top_bar',
  ClickedNavbarSettingsButton = 'Settings Button Clicked',
  ClickedNavbarAvatarButton = 'Avatar Button Clicked',
  ClickedAvatarDropDownElement = 'avatar_drop_down_menu',
  ClickedAvatarDropDownUpgradeButton = 'Upgrade Button Clicked',
  ClickedAvatarDropDownDownloadDesktopAppButton = 'Download Desktop App',
}

export interface RudderIdentify {
  email: string,
  uuid: string,
  is_logged_in?: boolean
}

export enum RudderAnalyticsPage {
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

export interface PriceMetadata {
  maxSpaceBytes: string,
  name: string,
  planType: string,
  show?: string
}

export interface RecurringPrice {
  aggregate_usage?: unknown,
  interval: 'month' | 'year',
  interval_count: number,
  trial_period_days: number,
  usage_type: string
}

export interface PriceData {
  active: boolean,
  billing_schema: string,
  created: number,
  currency: string,
  id: string,
  livemode: boolean,
  lookup_key?: string,
  metadata: PriceMetadata,
  nickname: string,
  object: string,
  product: string,
  recurring?: RecurringPrice,
  tax_behaviour: string,
  transform_quantity: unknown,
  type: 'recurring' | 'one_time',
  unit_amount: number,
  unit_amount_decimal: string
}