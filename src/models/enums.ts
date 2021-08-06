export enum AppViewLayout {
  Empty = 'empty',
  HeaderAndSidenav = 'header-and-sidenav'
}

export enum FileStatusTypes {
  Error = 'error',
  Success = 'success',
  Encrypting = 'encrypting',
  Decrypting = 'decrypting',
  Pending = 'pending',
  Downloading = 'downloading',
  Uploading = 'uploading',
  CreatingDirectoryStructure = 'creating-directory-structure'
}

export enum FileActionTypes {
  Download = 'download',
  Upload = 'upload',
  UploadFolder = 'upload-folder'
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