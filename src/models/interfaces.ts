import { AppViewLayout, FileActionTypes, FileStatusTypes } from './enums';

export interface AppConfig {
  fileExplorer: AppFileExplorerConfig;
  views: AppViewConfig;
}

export interface AppFileExplorerConfig {
  recentsLimit: number;
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
  bucket: string | null,
  color: string | null,
  createdAt: string,
  encrypt_version: string | null,
  icon: string | null,
  iconId: number | null,
  icon_id: number | null,
  id: number,
  isDowloading: boolean,
  isFolder: boolean,
  isLoading: boolean,
  isSelected: boolean,
  name: string,
  parentId: number,
  parent_id: number | null,
  updatedAt: string,
  userId: number,
  user_id: number,
}

export interface DriveFolderMetadataPayload {
  metadata: {
    itemName?: string;
    color?: string;
    icon?: string;
  }
}

export interface DriveFileData {
  bucket: string,
  createdAt: string,
  created_at: string,
  deleted: false,
  deletedAt: null,
  encrypt_version: string,
  fileId: string,
  folderId: number,
  folder_id: number,
  id: number,
  name: string,
  size: number,
  type: string,
  updatedAt: string,
}

export interface DriveFileMetadataPayload {
  metadata: { itemName: string; }
}

export type DriveItemData = DriveFileData & DriveFolderData

export interface NotificationData {
  uuid: string;
  isFolder: boolean;
  type?: string;
  name: string;
  action: FileActionTypes;
  status: FileStatusTypes;
  progress?: number;
}

export interface UpdateNotificationPayload {
  uuid: string;
  merge: {
    status?: FileStatusTypes;
    progress?: number;
  }
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
  createFolder: string,
  teamMembers: number
}

export type IBillingPlan = {
  [id: string]: {
    product: IStripeProduct,
    plans: IStripePlan[],
    selected: string,
    currentPlan: string
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

export type IUserPlan = {
  name: StripeProductNames,
  paymentInterval: StripePlanNames,
  planId: string,
  price: string,
  productId: string
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

export interface InfoInvitationsMembers {
  isMember: boolean;
  isInvitation: boolean;
  user: string;
}