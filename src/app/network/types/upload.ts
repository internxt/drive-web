import { DriveFileData } from 'app/drive/types';
import { FileToUpload } from 'app/drive/services/file.service/types';
import { UploadFailure } from '../uploadFailure';
import { UploadItemKind } from '.';

export type UploadFileItem = { kind: UploadItemKind.File; file: FileToUpload };

export type UploadItem = UploadFileItem;

export type UploadedItem = DriveFileData;

/**
 * Upload progress notifications emitted by the manager. The manager knows nothing
 * about how uploads are presented to the user; observers subscribe to these events.
 */
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
