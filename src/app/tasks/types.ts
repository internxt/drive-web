import { FunctionComponent, SVGProps } from 'react';
import { DriveFileData, DriveFolderData, DriveItemData } from '../drive/types';
import { IRoot } from '../store/slices/storage/types';

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
  nItems?: number;
  cancellable: boolean;
  showNotification: boolean;
  subtitle?: string;
  stop?: () => Promise<void>;
}

export interface CreateFolderTask extends BaseTask {
  action: TaskType.CreateFolder;
  cancellable: false;
  folderName: string;
  parentFolderId: string;
  item?: IRoot;
}

export interface DownloadFileTask extends BaseTask {
  action: TaskType.DownloadFile;
  cancellable: true;
  file: DriveFileData;
}

export interface DownloadFilesTask extends BaseTask {
  action: TaskType.DownloadFile;
  cancellable: true;
  file: { name: string; type: string; items?: DriveItemData[] };
}

export interface DownloadFolderTask extends BaseTask {
  action: TaskType.DownloadFolder;
  cancellable: boolean;
  folder: DriveFolderData;
  compressionFormat: string;
}

export interface DownloadBackupTask extends BaseTask {
  action: TaskType.DownloadBackup;
  cancellable: true;
  backup: { name: string; type: string };
}

export interface UploadFileTask extends BaseTask {
  action: TaskType.UploadFile;
  cancellable: true;
  fileName: string;
  fileType: string;
  isFileNameValidated: boolean;
  item: { uploadFile: File; parentFolderId: string };
  sharedItemAuthenticationData?: SharedItemAuthenticationData;
}

export interface UploadFolderTask extends BaseTask {
  action: TaskType.UploadFolder;
  cancellable: true;
  folderName: string;
  item: IRoot;
  parentFolderId: string;
}

export interface MoveFileTask extends BaseTask {
  action: TaskType.MoveFile;
  cancellable: false;
  file: DriveFileData;
  destinationFolderId: string;
}

export interface MoveFolderTask extends BaseTask {
  action: TaskType.MoveFolder;
  cancellable: false;
  folder: DriveFolderData;
  destinationFolderId: string;
}

export interface RenameFileTask extends BaseTask {
  action: TaskType.RenameFile;
  cancellable: true;
  file: DriveFileData;
  destinationFolderId?: string;
}

export interface RenameFolderTask extends BaseTask {
  action: TaskType.RenameFolder;
  cancellable: true;
  folder: DriveFolderData;
  destinationFolderId?: string;
}

export type TaskData = (
  | CreateFolderTask
  | DownloadFileTask
  | DownloadFilesTask
  | DownloadFolderTask
  | DownloadBackupTask
  | UploadFileTask
  | UploadFolderTask
  | MoveFileTask
  | MoveFolderTask
  | RenameFileTask
  | RenameFolderTask
) & { file?: DriveFileData | DownloadFilesData } & {
  folder?: DriveFolderData;
} & { item?: UploadFileData } & { fileType?: string } & {
  item?: IRoot;
  parentFolderId?: number;
  sharedItemAuthenticationData?: SharedItemAuthenticationData;
  itemUUID?: { rootFolderUUID?: string; fileUUID?: string };
};

export type DownloadFilesData = { name: string; type: string; items?: DriveItemData[] };
export type DownloadFolderData = { id: number; name: string; type: string; isFolder: boolean };
export type UploadFileData = { uploadFile: File; parentFolderId: string };
export type UploadFolderData = { folder: IRoot; parentFolderId: string };
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
  nItems?: number;
  isTaskCancellable: boolean;
}

export interface TaskFilter {
  relatedTaskId?: string;
  status?: TaskStatus[];
}

export interface UpdateTaskPayload {
  taskId: string;
  merge: Partial<TaskData>;
}
