export enum AppViewLayout {
  Empty = 'empty',
  HeaderAndSidenav = 'header-and-sidenav'
}

export enum TaskStatus {
  Pending = 'pending',
  Encrypting = 'encrypting',
  Decrypting = 'decrypting',
  InProcess = 'in-process',
  Error = 'error',
  Success = 'success'
}

export enum TaskType {
  DownloadFile = 'download-file',
  DownloadFolder = 'download-folder',
  UploadFile = 'upload-file',
  UploadFolder = 'upload-folder',
  MoveFile = 'move-file',
  MoveFolder = 'move-folder'
}

export enum ItemAction {
  Rename,
  Download,
  Share,
  Info,
  Delete
}

export enum AnalyticsTrack {
  SignOut = 'user-signout',
  SignIn = 'user-signin',
  SignInAttempted = 'user-signin-attempted',
  SignUp = 'user-signup',
  UserEnterPayments = 'user-enter-payments',
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
}

export enum DevicePlatform {
  Web = 'web'
}

export enum FileViewMode {
  List = 'list',
  Grid = 'grid'
}
export enum Workspace {
  Personal = 'personal',
  Business = 'business'
}

export enum DragAndDropType {
  DriveItem = 'drive-item'
}

export enum StorageItemList {
  Drive = 'drive',
  Recents = 'recents'
}

export enum StripeMemberTiers {
  'infinite',
  'lifetime',
  'premium'
}

export enum StripeSimpleNames {
  'infinite',
  '20TB',
  '2TB',
  '200GB',
  '20GB'
}

export enum StripeProductNames {
  'Drive 20GB',
  'Drive 200GB',
  'Drive 2 TB'
}

export enum TimeInterval {
  Month = 'month',
  Year = 'year'
}

export enum RenewalPeriod {
  Monthly = 'Monthly',
  Semiannually = 'Semiannually',
  Annually = 'Annually'
}

export enum LocalStorageItem {
  Workspace = 'workspace',
  User = 'xUser',
  UserMnemonic = 'xMnemonic',
  UserToken = 'xToken',
  Team = 'xTeam',
  TeamToken = 'xTokenTeam'
}