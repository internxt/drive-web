import { DriveFileData } from 'app/drive/types';
import { FileToUpload } from 'app/drive/services/file.service/types';
import { UploadFailure } from './uploadFailure';

export enum UploadItemKind {
  File = 'file',
}

export enum UploadFailureReason {
  ConnectionLost = 'connection-lost',
  NoSpaceLeft = 'no-space',
  FileTooLarge = 'file-too-large',
  UploadFailed = 'upload-failed',
}

export type UploadFileItem = { kind: UploadItemKind.File; file: FileToUpload };

export type UploadItem = UploadFileItem;

export type UploadedItem = DriveFileData;

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
