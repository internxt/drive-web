import { AppViewLayout, FileActionTypes, FileStatusTypes } from './enums';

export interface AppConfig {
  views: AppViewConfig;
}

export interface AppViewConfig {
  id: string;
  layout: AppViewLayout;
  path: string;
  exact: boolean;
  auth?: boolean;
}

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
  teams?: boolean;
}

export interface TeamsSettings {
  bucket: string
  bridge_mnemonic: string
  isAdmin: boolean
  bridge_password: string
  bridge_user: string,
  root_folder_id: number;
}

export interface DriveFolderData {
  isFolder: boolean,
  isSelected: boolean,
  isLoading: boolean,
  isDowloading: boolean,
  id: number,
  parentId: number,
  name: string,
  bucket: string | null,
  user_id: number,
  icon_id: number | null,
  color: string | null,
  encrypt_version: string | null,
  createdAt: string,
  updatedAt: string,
  userId: number,
  iconId: number | null,
  parent_id: number | null,
  icon: string | null,
}

export interface DriveFolderMetadataPayload {
  metadata: {
    itemName?: string;
    color?: string;
    icon?: string;
  }
}

export interface DriveFileData {
  created_at: string,
  id: number,
  fileId: string,
  name: string,
  type: string,
  size: number,
  bucket: string,
  folder_id: number,
  encrypt_version: string,
  deleted: false,
  deletedAt: null,
  createdAt: string,
  updatedAt: string,
  folderId: number,
}

export interface DriveFileMetadataPayload {
  metadata: { itemName: string; }
}

export type DriveItemData = DriveFileData | DriveFolderData

export interface ILoggerFile {
  isFolder: boolean,
  filePath: string,
  action: keyof typeof FileActionTypes,
  status: keyof typeof FileStatusTypes,
  progress?: string
}

export interface ILogger {
  [filePath: string]: ILoggerFile
}
export interface IFormValues {
  name: string,
  lastname: string,
  email: string,
  password: string,
  currentPassword: string,
  twoFactorCode: string,
  confirmPassword: string,
  acceptTerms: boolean,
  backupKey: string,
  createFolder: string
}

export type IBillingPlan = {
  [id: string]: {
    product: IStripeProduct,
    plans: IStripePlan[],
    selected: string
  }
}

export type IStripeProduct = {
  id: string,
  metadata: StripeProductMetadata,
  name: StripeProductNames,
  test?: boolean
}

export type IStripeCustomer = {
  product: string,
  payment_frequency: StripePlanNames
}

export type StripeProductMetadata = {
  is_drive: string,
  member_tier: keyof typeof StripeMemberTiers,
  price_eur: string,
  simple_name: keyof typeof StripeSimpleNames,
  size_bytes: string
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

export type IStripePlan = {
  id: string,
  interval: keyof typeof StripePlanIntervals,
  interval_count: number,
  name: keyof typeof StripePlanNames,
  price: number
}

enum StripePlanIntervals {
  'month',
  'year'
}

enum StripePlanNames {
  'Montlhy',
  'Semiannually',
  'Annually'
}

export interface IActionUpdateFileLoggerEntry {
  filePath: string,
  action?: FileActionTypes,
  status?: FileStatusTypes,
  progress?: number,
  errorMessage?: string
}

export interface FolderPath {
  name: string,
  id: number
}