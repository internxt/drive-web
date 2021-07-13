export enum FileStatusType {
    Error = 'error',
    Success = 'success',
    Encrypting = 'encrypting',
    Downloading = 'downloading',
    Uploading = 'uploading',
    None = 'none'
}

export enum AnalyticsTrack {
    SignOut = 'user-signout',
    SignIn = 'user-signin',
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
    DeleteWelcomeFile = 'file-welcome-delete'
}

export enum DevicePlatform {
    Web = 'web'
}