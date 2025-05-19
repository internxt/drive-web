import { RenewalPeriod } from '@internxt/sdk/dist/drive/payments/types';
import { ShareLink } from '@internxt/sdk/dist/drive/share/types';
import { UserResumeData } from '@internxt/sdk/dist/drive/users/types';
import { AppSumoDetails } from '@internxt/sdk/dist/shared/types/appsumo';
import { AdvancedSharedItem } from 'app/share/types';
import { SVGProps } from 'react';

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
  plain_name: string;
  plainName?: string | null;
  parentId: number;
  parentUuid: string;
  parent_id: number | null;
  updatedAt: string;
  userId: number;
  user_id: number;
  shares?: Array<ShareLink>;
  sharings?: { type: string; id: string }[];
  uuid: string;
  type?: string;
  user?: UserResumeData;
}

export interface DriveFolderMetadataPayload {
  itemName: string;
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
  folderUuid: string;
  id: number;
  name: string;
  plain_name: string | null;
  plainName?: string | null;
  size: number;
  type: string;
  updatedAt: string;
  status: string;
  thumbnails: Array<Thumbnail>;
  currentThumbnail: Thumbnail | null;
  shares?: Array<ShareLink>;
  sharings?: { type: string; id: string }[];
  uuid: string;
  user?: UserResumeData;
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
  itemName: string;
}

export type DriveItemData = DriveFileData & DriveFolderData;

export interface DriveItemPatch {
  name?: string;
  plain_name?: string;
  plainName?: string;
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
  uuid: string;
}

export interface FolderPathDialog {
  name: string;
  uuid: string;
}

export enum FileViewMode {
  List = 'list',
  Grid = 'grid',
}

export enum DownloadFolderMethod {
  FileSystemAccessAPI = 'file-system-access-api',
  StreamSaver = 'stream-saver',
}

export enum FreeStoragePlan {
  simpleName = '1GB',
  storageLimit = 1073741824,
}

export type DriveItemDetails = (DriveItemData | AdvancedSharedItem) & {
  isShared: boolean;
  userEmail?: string;
  view: 'Drive' | 'Shared';
};

export type ItemDetailsProps = {
  name: string;
  uploadedBy: string;
  location: string;
  uploaded: string;
  modified: string;
  shared: string;
  type?: string;
  size?: string;
};
