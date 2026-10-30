import { DriveFileData, DriveFolderData } from 'app/drive/types';
import { FileToUpload } from 'app/drive/services/file.service/types';
import { IRoot } from 'app/store/slices/storage/types';
import { UploadFailure } from '../uploadFailure';
import { UploadItemKind } from '.';

export type UploadFileItem = { kind: UploadItemKind.File; file: FileToUpload; parent?: UploadFolderItem };

export type UploadFolderItem = {
  kind: UploadItemKind.Folder;
  folder: IRoot;
  parentFolderUuid: string;
  parent?: UploadFolderItem;
};

export type UploadItem = UploadFileItem | UploadFolderItem;

export type UploadedItem = DriveFileData | DriveFolderData;

export interface UploadManagerEvents {
  onItemStarted?: (item: UploadItem) => void;
  onItemProgress?: (item: UploadItem, progress: number) => void;
  onItemSucceeded?: (item: UploadItem, uploadedItem: UploadedItem) => void | Promise<void>;
  onItemFailed?: (item: UploadItem, failure: UploadFailure) => void;
  onItemCancelled?: (item: UploadItem) => void;
}

export interface UploadResult {
  succeeded: { item: UploadItem; uploadedItem: UploadedItem }[];
  failed: { item: UploadItem; failure: UploadFailure }[];
}
