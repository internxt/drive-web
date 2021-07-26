import { AppViewLayout, FileActionTypes, FileStatusTypes } from './enums';

export interface AppConfig {
  views: AppViewConfig;
}

export interface AppViewConfig {
  id: string;
  layout: AppViewLayout;
  path: string;
  exact: boolean;
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
  bridge_user: string
}

export interface FileData {
  isFolder: boolean,
  isSelected:boolean,
  isLoading:boolean,
  isDowloading:boolean,
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
  fileStatus: FileStatusTypes,
  progress: string
}
export interface ILoggerFile {
  action: FileActionTypes,
  filePath: string,
  status: FileStatusTypes,
  progress?: number,
  isFolder: boolean,
  errorMessage?: string
}

export interface IFormValues {
  name: string,
  lastname: string,
  email: string,
  password: string,
  currentPassword: string,
  twoFactorCode: string,
  confirmPassword: string,
  remember: boolean,
  acceptTerms: boolean,
  backupKey: string
}

export type IBillingPlan = {
  [id: string]: {
    product: IStripeProduct,
    plans: IStripePlan[]
  }
}

export type IStripeProduct = {
  id: string,
  metadata: StripeProductMetadata,
  name: StripeProductNames,
  test?: boolean
}

export type StripeProductMetadata = {
  is_drive: string,
  member_tier: StripeMemberTiers,
  price_eur: string,
  simple_name: StripeSimpleNames,
  size_bytes: string
}

export type StripeMemberTiers = {
  infinite: string, lifetime: string, premium: string
}

export type StripeSimpleNames = {
  'infinite': string,
  '20TB': string,
  '2TB': string,
  '200GB': string,
  '20GB': string
}

export type StripeProductNames = {
  'Drive 20GB': string,
  'Drive 200GB': string,
  'Drive 2 TB': string
}

export type IStripePlan = {
  id: string,
  interval: StripePlanIntervals,
  interval_count: number,
  name: StripePlanNames,
  price: number
}

type StripePlanIntervals = {
  'month',
  'year'
}

type StripePlanNames = {
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