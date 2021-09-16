export enum AppViewLayout {
  Empty = 'empty',
  HeaderAndSidenav = 'header-and-sidenav',
}

export enum AppView {
  Signup = 'signup',
  AppSumo = 'appsumo',
  Login = 'login',
  Drive = 'drive',
  Recents = 'recents',
  Account = 'account',
  TeamsJoin = 'teams-join',
  Deactivation = 'deactivation',
  TeamsDeactivation = 'teams-deactivation',
  TeamSuccess = 'team-success',
  Checkout = 'checkout',
  Remove = 'remove',
  ShareToken = 'share-token',
  GuestAcceptInvite = 'guest-accept-invite',
  NotFound = 'not-found',
  Plans = 'account?tab=plans',
}

export enum ItemAction {
  Rename,
  Download,
  Share,
  Info,
  Delete,
}

export enum AnalyticsTrack {
  SignOut = 'user-signout',
  SignIn = 'user-signin',
  SignInAttempted = 'user-signin-attempted',
  SignUp = 'User Signup',
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

export enum SignupDeviceSource {
  Macintosh = 'MacOs',
  Android = 'Android',
  Iphone = 'iPhone',
  Windows = 'Windows',
  Linux = 'Linux',
  Ipad = 'iPad',
  Other = 'Other',
}

export enum DevicePlatform {
  Web = 'web',
}

export enum FileViewMode {
  List = 'list',
  Grid = 'grid',
}
export enum Workspace {
  Individuals = 'personal',
  Business = 'business',
}

export enum DragAndDropType {
  DriveItem = 'drive-item',
}

export enum StorageItemList {
  Drive = 'drive',
  Recents = 'recents',
}

export enum StripeMemberTiers {
  'infinite',
  'lifetime',
  'premium',
}

export enum TimeInterval {
  Month = 'month',
  Year = 'year',
}

export enum RenewalPeriod {
  Monthly = 'monthly',
  Annually = 'annually',
  Lifetime = 'lifetime',
}

export enum LocalStorageItem {
  Workspace = 'workspace',
  User = 'xUser',
  UserMnemonic = 'xMnemonic',
  UserToken = 'xToken',
  Team = 'xTeam',
  TeamToken = 'xTokenTeam',
}

export enum TwoFactorAuthStep {
  Download = 'download',
  QR = 'qr',
  BackupKey = 'backup-key',
  Enable = 'enable',
}

export enum ProductPriceType {
  Recurring = 'recurring',
  OneTime = 'one_time',
}

export enum StripeSessionMode {
  Payment = 'payment',
  Setup = 'setup',
  Subscription = 'subscription',
}

export enum LifetimeTier {
  Lifetime = 'lifetime',
  Exclusive = 'exclusive-lifetime',
  Infinite = 'infinite',
}
