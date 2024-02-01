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
  cancellable: true;
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
  cancellable: true;
  backup: { name: string; type: string };
}

export interface UploadFileTask extends BaseTask {
  action: TaskType.UploadFile;
  cancellable: true;
  fileName: string;
  fileType: string;
  isFileNameValidated: boolean;
  item: { uploadFile: File; parentFolderId: number };
}

export interface UploadFolderTask extends BaseTask {
  action: TaskType.UploadFolder;
  cancellable: true;
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
  cancellable: true;
  numberOfPhotos: number;
}

export interface RenameFileTask extends BaseTask {
  action: TaskType.RenameFile;
  cancellable: true;
  file: DriveFileData;
  destinationFolderId?: number;
}

export interface RenameFolderTask extends BaseTask {
  action: TaskType.RenameFolder;
  cancellable: true;
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
};

export type DownloadFilesData = { name: string; type: string; items?: DriveItemData[] };
export type DownloadFolderData = { id: number; name: string };
export type UploadFileData = { uploadFile: File; parentFolderId: number };
export type UploadFolderData = { folder: IRoot; parentFolderId: number };

export interface TaskNotification {
  taskId: string;
  action: TaskType;
  status: TaskStatus;
  title: string;
  item?: DriveItemData | DownloadFilesData | DownloadFolderData | UploadFileData | UploadFolderData;
  subtitle: string;
  icon: FunctionComponent<SVGProps<SVGSVGElement>>;
  progress: number;
  isTaskCancellable: boolean;
  fileType?: string;
}

export interface TaskFilter {
  relatedTaskId?: string;
  status?: TaskStatus[];
}

export interface UpdateTaskPayload {
  taskId: string;
  merge: Partial<TaskData>;
}
