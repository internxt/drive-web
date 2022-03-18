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
}

export default class AppError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);

    this.status = status;
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
}

export enum AppView {
  Signup = 'signup',
  AppSumo = 'appsumo',
  Login = 'login',
  Recover = 'recover',
  Drive = 'drive',
  Recents = 'recents',
  Backups = 'backups',
  Photos = 'photos',
  Account = 'account',
  TeamsJoin = 'teams-join',
  Deactivation = 'deactivation',
  TeamsDeactivation = 'teams-deactivation',
  TeamSuccess = 'team-success',
  CheckoutSuccess = 'checkout-success',
  Checkout = 'checkout',
  Remove = 'remove',
  ShareFileToken = 'share-token',
  ShareFolderToken = 'share-folder-token',
  GuestAcceptInvite = 'guest-accept-invite',
  RedirectToApp = 'redirect-to-app',
  NotFound = 'not-found',
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
