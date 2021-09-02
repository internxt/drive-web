import { items as itemsLib } from '@internxt/lib';
import { FunctionComponent, SVGProps } from 'react';
import { DriveFileData, DriveFolderData } from '../models/interfaces';
import i18n from './i18n.service';
import iconService from './icon.service';

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
  DownloadFile = 'download-file',
  UploadFile = 'upload-file',
  UploadFolder = 'upload-folder',
  MoveFile = 'move-file',
  MoveFolder = 'move-folder',
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

export interface DownloadFileTask extends BaseTask {
  action: TaskType.DownloadFile;
  cancellable: true;
  file: DriveFileData;
}

export interface UploadFileTask extends BaseTask {
  action: TaskType.UploadFile;
  cancellable: true;
  fileName: string;
  fileType: string;
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

export type TaskData = DownloadFileTask | UploadFileTask | UploadFolderTask | MoveFileTask | MoveFolderTask;

export interface NotificationData {
  taskId: string;
  status: TaskStatus;
  title: string;
  subtitle: string;
  icon: FunctionComponent<SVGProps<SVGSVGElement>>;
  progress: number;
  isTaskCancellable: boolean;
}

const getTaskNotificationTitle = (task: TaskData): string => {
  let title = '';

  switch (task.action) {
    case TaskType.DownloadFile: {
      title = itemsLib.getItemDisplayName(task.file);
      break;
    }
    case TaskType.UploadFile: {
      title = itemsLib.getItemDisplayName({ name: task.fileName, type: task.fileType });
      break;
    }
    case TaskType.UploadFolder: {
      title = itemsLib.getItemDisplayName({ name: task.folderName });
      break;
    }
    case TaskType.MoveFile: {
      title = itemsLib.getItemDisplayName(task.file);
      break;
    }
    case TaskType.MoveFolder: {
      title = itemsLib.getItemDisplayName(task.folder);
      break;
    }
  }

  return title;
};

const getTaskNotificationSubtitle = (task: TaskData): string => {
  return i18n.get(`tasks.${task.action}.${task.status}`, {
    progress: task.progress ? (task.progress * 100).toFixed(2) : 0,
  });
};

const getTaskNotificationIcon = (task: TaskData): FunctionComponent<SVGProps<SVGSVGElement>> => {
  let icon;

  switch (task.action) {
    case TaskType.DownloadFile: {
      icon = iconService.getItemIcon(false, task.file.type);
      break;
    }
    case TaskType.UploadFile: {
      icon = iconService.getItemIcon(false, task.fileType);
      break;
    }
    case TaskType.UploadFolder: {
      icon = iconService.getItemIcon(true, '');
      break;
    }
    case TaskType.MoveFile: {
      icon = iconService.getItemIcon(false, task.file.type);
      break;
    }
    case TaskType.MoveFolder: {
      icon = iconService.getItemIcon(true, '');
      break;
    }
  }

  return icon;
};

const taskManagerService = {
  getNotification(task: TaskData): NotificationData {
    return {
      taskId: task.id,
      status: task.status,
      title: getTaskNotificationTitle(task),
      subtitle: getTaskNotificationSubtitle(task),
      icon: getTaskNotificationIcon(task),
      progress: task.progress,
      isTaskCancellable: task.cancellable,
    };
  },
};

export default taskManagerService;
