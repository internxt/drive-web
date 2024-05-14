import { FunctionComponent, SVGProps } from 'react';
import { DriveFileData, DriveFolderData, DriveItemData } from '../drive/types';
import { IRoot } from '../store/slices/storage/storage.thunks/uploadFolderThunk';

export enum TaskStatus {
  Pending = 'pending',
  Encrypting = 'encrypting',
  Decrypting = 'decrypting',
  InProcess = 'in-process',
  Paused = 'paused',
  Error = 'error',
  Success = 'success',
  Cancelled = 'cancelled',
}

export enum TaskType {
  CreateFolder = 'create-folder',
  DownloadFile = 'download-file',
  DownloadFolder = 'download-folder',
  DownloadBackup = 'download-backup',
  UploadFile = 'upload-file',
  UploadFolder = 'upload-folder',
  MoveFile = 'move-file',
  MoveFolder = 'move-folder',
  DownloadPhotos = 'download-photos',
  RenameFile = 'rename-file',
  RenameFolder = 'rename-folder',
}

export enum TaskProgress {
  Min = 0.0,
  Max = 1.0,
}

export enum TaskEvent {
  TaskAdded = 'task-added',
  TaskUpdated = 'task-updated',
  TaskCompleted = 'task-completed',
  TaskCancelled = 'task-cancelled',
  TaskRemoved = 'task-removed',
  TaskError = 'task-error',
}

export interface BaseTask {
  id: string;
  relatedTaskId?: string;
  action: TaskType;
  status: TaskStatus;
  progress: number;
  cancellable: boolean;
  showNotification: boolean;
  subtitle?: string;
  stop?: () => Promise<void>;
}

export interface CreateFolderTask extends BaseTask {
  action: TaskType.CreateFolder;
  cancellable: false;
  folderName: string;
  parentFolderId: number;
  item?: IRoot;
}

export interface DownloadFileTask extends BaseTask {
  action: TaskType.DownloadFile;
  cancellable: boolean;
  file: { name: string; type: string; items?: DriveItemData[] };
}

export interface DownloadFolderTask extends BaseTask {
  action: TaskType.DownloadFolder;
  cancellable: boolean;
  folder: { id: number; name: string };
  compressionFormat: string;
}

export interface DownloadBackupTask extends BaseTask {
  action: TaskType.DownloadBackup;
  cancellable: boolean;
  backup: { name: string; type: string };
}

export interface UploadFileTask extends BaseTask {
  action: TaskType.UploadFile;
  cancellable: boolean;
  displayRetry?: boolean;
  fileName: string;
  fileType: string;
  isFileNameValidated: boolean;
  item: { uploadFile: File; parentFolderId: number };
  sharedItemAuthenticationData?: SharedItemAuthenticationData;
}

export interface UploadFolderTask extends BaseTask {
  action: TaskType.UploadFolder;
  cancellable: boolean;
  folderName: string;
  item: IRoot;
  parentFolderId: number;
}

export interface MoveFileTask extends BaseTask {
  action: TaskType.MoveFile;
  cancellable: false;
  file: DriveFileData;
  destinationFolderId: number;
}

export interface MoveFolderTask extends BaseTask {
  action: TaskType.MoveFolder;
  cancellable: false;
  folder: DriveFolderData;
  destinationFolderId: number;
}

export interface DownloadPhotosTask extends BaseTask {
  action: TaskType.DownloadPhotos;
  cancellable: boolean;
  numberOfPhotos: number;
}

export interface RenameFileTask extends BaseTask {
  action: TaskType.RenameFile;
  cancellable: boolean;
  file: DriveFileData;
  destinationFolderId?: number;
}

export interface RenameFolderTask extends BaseTask {
  action: TaskType.RenameFolder;
  cancellable: boolean;
  folder: DriveFolderData;
  destinationFolderId?: number;
}

export type TaskData = (
  | CreateFolderTask
  | DownloadFileTask
  | DownloadFolderTask
  | DownloadBackupTask
  | UploadFileTask
  | UploadFolderTask
  | MoveFileTask
  | MoveFolderTask
  | DownloadPhotosTask
  | RenameFileTask
  | RenameFolderTask
) & { file?: DriveFileData | DownloadFilesData } & {
  folder?: DownloadFolderData;
} & { item?: UploadFileData } & { fileType?: string } & {
  item?: IRoot;
  parentFolderId?: number;
  sharedItemAuthenticationData?: SharedItemAuthenticationData;
  itemUUID?: { rootFolderUUID?: string; fileUUID?: string };
};

export type DownloadFilesData = { name: string; type: string; items?: DriveItemData[] };
export type DownloadFolderData = { id: number; name: string };
export type UploadFileData = { uploadFile: File; parentFolderId: number };
export type UploadFolderData = { folder: IRoot; parentFolderId: number };
export type UploadSharedItemData = UploadFileData & SharedItemAuthenticationData;
export type SharedItemAuthenticationData = {
  currentFolderId: string;
  ownerUserAuthenticationData: {
    token: string;
    bridgeUser: string;
    bridgePass: string;
    encryptionKey: string;
    bucketId: string;
  };
  isDeepFolder: boolean;
};

export interface TaskNotification {
  taskId: string;
  action: TaskType;
  status: TaskStatus;
  title: string;
  item?: DownloadFilesData | DownloadFolderData | UploadFileData | UploadFolderData;
  sharedItemAuthenticationData?: SharedItemAuthenticationData;
  itemUUID?: { rootFolderUUID?: string; fileUUID?: string };
  fileType?: string;
  subtitle: string;
  icon: FunctionComponent<SVGProps<SVGSVGElement>>;
  progress: number;
  isTaskCancellable: boolean;
  displayRetry?: boolean;
}

export interface TaskFilter {
  relatedTaskId?: string;
  status?: TaskStatus[];
}

export interface UpdateTaskPayload {
  taskId: string;
  merge: Partial<TaskData>;
}
