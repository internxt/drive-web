import { FunctionComponent, SVGProps } from 'react';
import { DriveFileData, DriveFolderData } from '../drive/types';

export enum TaskStatus {
  Pending = 'pending',
  Encrypting = 'encrypting',
  Decrypting = 'decrypting',
  InProcess = 'in-process',
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
}

export enum TaskProgress {
  Min = 0.0,
  Max = 1.0,
}

export enum TaskManagerEvent {
  TaskAdded = 'task-added',
  TaskUpdated = 'task-updated',
  TaskCompleted = 'task-completed',
  TaskCancelled = 'task-cancelled',
}

interface BaseTask {
  id: string;
  relatedTaskId?: string;
  action: TaskType;
  status: TaskStatus;
  progress: number;
  cancellable: boolean;
  showNotification: boolean;
  stop?: () => Promise<void>;
}

export interface CreateFolderTask extends BaseTask {
  action: TaskType.CreateFolder;
  cancellable: false;
  folderName: string;
  parentFolderId: number;
}

export interface DownloadFileTask extends BaseTask {
  action: TaskType.DownloadFile;
  cancellable: true;
  file: { name: string; type: string };
}

export interface DownloadFolderTask extends BaseTask {
  action: TaskType.DownloadFolder;
  cancellable: true;
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
}

export interface UploadFolderTask extends BaseTask {
  action: TaskType.UploadFolder;
  cancellable: true;
  folderName: string;
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

export type TaskData =
  | CreateFolderTask
  | DownloadFileTask
  | DownloadFolderTask
  | DownloadBackupTask
  | UploadFileTask
  | UploadFolderTask
  | MoveFileTask
  | MoveFolderTask;

export interface TaskNotification {
  taskId: string;
  status: TaskStatus;
  title: string;
  subtitle: string;
  icon: FunctionComponent<SVGProps<SVGSVGElement>>;
  progress: number;
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
