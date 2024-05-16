import { DatabaseProvider } from '../database/services/database.service';
import { DownloadFolderMethod } from '../drive/types';
import { store as storeInstance } from '../store';

type StoreType = typeof storeInstance;

export interface AppPlugin {
  install: (store: StoreType) => void;
}

export interface IFormValues {
  name: string;
  lastname: string;
  email: string;
  password: string;
  lastPassword: string;
  currentPassword: string;
  twoFactorCode: string;
  confirmPassword: string;
  acceptTerms: boolean;
  backupKey: string;
  createFolder: string;
  teamMembers: number;
  token: string;
  userRole: string;
}

export interface AppConfig {
  debug: AppDebugConfig;
  plan: AppPlanConfig;
  fileExplorer: AppFileExplorerConfig;
  views: AppViewConfig[];
  database: {
    name: string;
    version: number;
    provider: DatabaseProvider;
  };
}

export interface AppDebugConfig {
  enabled: boolean;
}

export interface AppPlanConfig {
  freePlanStorageLimit: number;
  maxStorageLimit: number;
}

export interface AppFileExplorerDownloadConfig {
  folder: {
    method: DownloadFolderMethod;
  };
}
export interface AppFileExplorerConfig {
  download: AppFileExplorerDownloadConfig;
  recentsLimit: number;
}

export interface AppViewConfig {
  id: string;
  layout: AppViewLayout;
  path: string;
  exact: boolean;
  auth?: boolean;
  hideSearch?: boolean;
}

export default class AppError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);

    this.status = status;
    this.code = code;
  }
}

export enum DevicePlatform {
  Web = 'web',
}

export enum Workspace {
  Individuals = 'personal',
  Business = 'business',
}

export enum DragAndDropType {
  DriveItem = 'drive-item',
}

export enum TimeInterval {
  Month = 'month',
  Year = 'year',
}

export enum AppViewLayout {
  Empty = 'empty',
  HeaderAndSidenav = 'header-and-sidenav',
  Share = 'share',
}

export enum CampaignLinks {
  PcComponentes = 'https://www.pccomponentes.com',
}

export enum AppView {
  Signup = 'signup',
  AppSumo = 'appsumo',
  BlockedAccount = 'blocked-account',
  Login = 'login',
  SignupBlog = 'signup-blog',
  Auth = 'auth',
  ButtonAuth = 'buttonAuth',
  RecoverAccount = 'recover-account',
  Drive = 'drive',
  Recents = 'recents',
  Trash = 'trash',
  Backups = 'backups',
  SharedLinks = 'shared-links',
  Shared = 'shared',
  Photos = 'photos',
  Preferences = 'preferences',
  DriveItems = 'drive-items',
  FolderFileNotFound = 'folder-file-not-found',
  TeamsJoin = 'teams-join',
  Deactivation = 'deactivation',
  TeamsDeactivation = 'teams-deactivation',
  TeamSuccess = 'team-success',
  CheckoutSuccess = 'checkout-success',
  CheckoutCancel = 'checkout-cancel',
  CheckoutPlan = 'checkout-plan',
  Checkout = 'checkout',
  RecoveryLink = 'recovery-link',
  ShareFileToken = 'share-token',
  ShareFolderToken = 'share-folder-token',
  SharePhotosToken = 'share-photos-token',
  ShareGuestAcceptInvite = 'share-guest-accept-invite',
  GuestAcceptInvite = 'guest-accept-invite',
  RedirectToApp = 'redirect-to-app',
  NotFound = 'not-found',
  VerifyEmail = 'verify-email',
  ChangeEmail = 'change-email',
  RequestAccess = 'request-access',
  UniversalLinkSuccess = 'auth-success',
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

export enum LocalStorageItem {
  Workspace = 'workspace',
  User = 'xUser',
  UserMnemonic = 'xMnemonic',
  UserToken = 'xToken',
  Team = 'xTeam',
  TeamToken = 'xTokenTeam',
}

export enum OrderDirection {
  Asc = 'ASC',
  Desc = 'DESC',
}

export interface OrderSettings {
  by: string;
  direction: OrderDirection;
}
