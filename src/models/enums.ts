export enum IconTypes {
  FolderWithCrossGray = 'folderWithCrossGray',
  ClockGray = 'clockGray',
  AccountGray = 'accountGray',
  SupportGray = 'supportGray',
  LogOutGray = 'logOutGray',
  BackArrows = 'backArrows',
  InternxtLongLogo = 'internxtLongLogo',
  InternxtShortLogo = 'internxtShortLogo',
  FolderBlue = 'folderBlue',
  FileSuccessGreen = 'fileSuccessGreen',
  FileErrorRed = 'fileErrorRed',
  FileEncryptingGray = 'fileEncryptingGray',
  DoubleArrowUpBlue = 'doubleArrowUpBlue',
  DoubleArrowUpWhite = 'doubleArrowUpWhite',
  CrossGray = 'crossGray',
  CrossWhite = 'crossWhite',
  CrossNeutralBlue = 'crossNeutralBlue',
  CrossBlue = 'crossBlue'
}

export enum FileStatusTypes {
  Error = 'error',
  Success = 'success',
  Encrypting = 'encrypting',
  Decrypting = 'decrypting',
  Pending = 'pending',
  Downloading = 'downloading',
  Uploading = 'uploading',
  CreatingDirectoryStructure = 'creating-directoy-structure'
}

export enum FileActionTypes {
  Download = 'download',
  Upload = 'upload'
}

export enum AnalyticsTrack {
    SignOut = 'user-signout',
    SignIn = 'user-signin',
    SignUp = 'user-signup',
    UserEnterPayments = 'user-enter-payments',
    PlanSubscriptionSelected = 'plan-subscription-selected'
}