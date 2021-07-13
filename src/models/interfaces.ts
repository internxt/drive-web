export interface UserSettings {
  bucket: string
  createdAt: Date
  credit: number
  email: string
  lastname: string
  mnemonic: string
  name: string
  privateKey: string
  publicKey: string
  registerCompleted: boolean
  revocationKey: string
  root_folder_id: number
  userId: string
  uuid: string
}

export interface TeamsSettings {
  bucket: string
  bridge_mnemonic: string
  isAdmin: boolean
  bridge_password: string
  bridge_user: string
}

export interface ILogger {
  [filePath: string]: ILoggerFile
}

export interface ILoggerFile {
  action: FileActionTypes,
  filePath: string,
  status: FileStatusTypes,
  progress?: number,
  isFolder: boolean,
  errorMessage?: string
}

/* eslint-disable */ // salta el no-unused-vars, para corregirlo hay que instalar @typescript-eslint/no-unused-vars en vez de no-unused-vars
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