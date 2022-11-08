import { SVGProps } from 'react';
import { AppSumoDetails } from '@internxt/sdk/dist/shared/types/appsumo';
import { RenewalPeriod } from '../../payment/types';
import { ShareLink } from '@internxt/sdk/dist/drive/share/types';

export interface DriveFolderData {
  id: number;
  bucket: string | null;
  color: string | null;
  createdAt: string;
  deleted: boolean;
  encrypt_version: string | null;
  icon: string | null;
  iconId: number | null;
  icon_id: number | null;
  isFolder: boolean;
  name: string;
  parentId: number;
  parent_id: number | null;
  updatedAt: string;
  userId: number;
  user_id: number;
  shares?: Array<ShareLink>;
  plain_name: string;
}

export interface DriveFolderMetadataPayload {
  itemName?: string;
  color?: string;
  icon?: string;
}

export interface DriveFileData {
  bucket: string;
  createdAt: string;
  created_at: string;
  deleted: boolean;
  deletedAt: null;
  encrypt_version: string;
  fileId: string;
  folderId: number;
  folder_id: number;
  id: number;
  name: string;
  size: number;
  type: string;
  updatedAt: string;
  thumbnails: Array<Thumbnail>;
  currentThumbnail: Thumbnail | null;
  shares?: Array<ShareLink>;
}

interface Thumbnail {
  id: number;
  file_id: number;
  type: string;
  max_width: number;
  max_height: number;
  size: number;
  bucket_id: string;
  bucket_file: string;
  encrypt_version: string;
  urlObject?: string;
}

export enum ThumbnailConfig {
  MaxWidth = 300,
  MaxHeight = 300,
  Quality = 100,
  Type = 'png',
}

export interface DriveFileMetadataPayload {
  itemName?: string;
}

export type DriveItemData = DriveFileData & DriveFolderData;

export interface DriveItemPatch {
  name?: string;
  currentThumbnail?: Thumbnail;
  thumbnails?: Thumbnail[];
  shares?: ShareLink[];
}

export interface FileInfoMenuItem {
  id: string;
  icon: React.FunctionComponent<SVGProps<SVGSVGElement>>;
  title: string;
  features: { label: string; value: string }[];
}

export interface FolderTree {
  id: number;
  bucket: string | null;
  children: FolderTree[];
  encrypt_version: string;
  files: DriveFileData[];
  name: string;
  parentId: number;
  parent_id: number;
  userId: number;
  user_id: number;
  createdAt: string;
  updatedAt: string;
}

export type StoragePlan = {
  planId: string;
  productId: string;
  name: string;
  simpleName: string;
  paymentInterval: RenewalPeriod;
  price: number;
  monthlyPrice: number;
  currency: string;
  isTeam: boolean;
  isLifetime: boolean;
  renewalPeriod: RenewalPeriod;
  storageLimit: number;
  isAppSumo?: boolean;
  details?: AppSumoDetails;
};

export interface FolderPath {
  name: string;
  id: number;
}

export enum FileViewMode {
  List = 'list',
  Grid = 'grid',
}

export enum DownloadFolderMethod {
  FileSystemAccessAPI = 'file-system-access-api',
  StreamSaver = 'stream-saver',
}
