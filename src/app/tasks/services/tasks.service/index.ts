import { items as itemsLib } from '@internxt/lib';
import EventEmitter from 'events';
import { uniqueId } from 'utils/lodash';
import { FunctionComponent, SVGProps } from 'react';

import iconService from 'app/drive/services/icon.service';
import { t } from 'i18next';
import {
  BaseTask,
  DownloadFilesData,
  DownloadFolderData,
  TaskData,
  TaskEvent,
  TaskFilter,
  TaskNotification,
  TaskProgress,
  TaskStatus,
  TaskType,
  UpdateTaskPayload,
  UploadFileData,
  UploadFolderData,
} from '../../types';

const matchesFilter = (task: TaskData, { status, relatedTaskId }: TaskFilter): boolean => {
  const hasMatchingStatus = !status || status.includes(task.status);
  const hasMatchingRelatedTask = !relatedTaskId || task.relatedTaskId === relatedTaskId;
  return hasMatchingStatus && hasMatchingRelatedTask;
};

class TaskManagerService {
  private readonly tasksById: Map<string, TaskData>;
  private readonly notificationsByTaskId: Map<string, TaskNotification>;
  private eventEmitter: EventEmitter;

  constructor() {
    this.tasksById = new Map();
    this.notificationsByTaskId = new Map();
    this.eventEmitter = new EventEmitter();
  }

  public create<T extends BaseTask>(data: Omit<T, 'id' | 'status' | 'progress'>) {
    const task = this.taskFactory(data);

    this.tasksById.set(task.id, task);

    this.eventEmitter.emit(TaskEvent.TaskAdded, task);

    return task.id;
  }

  public updateTask(patch: UpdateTaskPayload) {
    const taskToUpdate = this.tasksById.get(patch.taskId);
    if (taskToUpdate) {
      Object.assign(taskToUpdate, patch.merge);
      this.notificationsByTaskId.delete(patch.taskId);
      this.eventEmitter.emit(TaskEvent.TaskUpdated, taskToUpdate);
    }
  }

  public clearTasks() {
    this.tasksById.clear();
    this.notificationsByTaskId.clear();
  }

  public removeTask(taskId: string) {
    this.tasksById.delete(taskId);
    this.notificationsByTaskId.delete(taskId);
    this.eventEmitter.emit(TaskEvent.TaskRemoved);
  }

  public getTasks(filter: TaskFilter = {}) {
    const tasks = Array.from(this.tasksById.values());
    return tasks.filter((task) => matchesFilter(task, filter));
  }

  public findTask(taskId: string) {
    return this.tasksById.get(taskId);
  }

  public isTaskFinished(taskId: string) {
    return [TaskStatus.Error, TaskStatus.Success, TaskStatus.Cancelled].includes(
      this.findTask(taskId)?.status || TaskStatus.Pending,
    );
  }

  public isTaskProgressCompleted(taskId: string) {
    return this.findTask(taskId)?.progress === TaskProgress.Max;
  }

  public getNotifications(filter: TaskFilter = {}) {
    return this.getTasks(filter)
      .filter((task) => task.showNotification)
      .map((task) => this.getCachedNotification(task))
      .reverse();
  }

  private getCachedNotification(task: TaskData): TaskNotification {
    const cachedNotification = this.notificationsByTaskId.get(task.id);
    if (cachedNotification) return cachedNotification;

    const notification = this.findNotification(task);
    this.notificationsByTaskId.set(task.id, notification);
    return notification;
  }

  public findNotification(task: TaskData): TaskNotification {
    return {
      taskId: task.id,
      action: task.action,
      status: task.status,
      item: this.parseNotifcationItem(task),
      sharedItemAuthenticationData: task.sharedItemAuthenticationData,
      fileType: task?.fileType,
      title: this.getTaskNotificationTitle(task),
      subtitle: this.getTaskNotificationSubtitle(task),
      icon: this.getTaskNotificationIcon(task),
      progress: task.progress,
      downloadedProgress: task.downloadedProgress,
      isTaskCancellable: task.cancellable,
      itemUUID: task?.itemUUID,
    };
  }

  private parseNotifcationItem(
    task: TaskData,
  ): DownloadFilesData | DownloadFolderData | UploadFileData | UploadFolderData {
    const parsedItem =
      (task.file ?? task.folder ?? task.action === TaskType.UploadFolder)
        ? { folder: task.item, parentFolderId: task.parentFolderId }
        : task.item;

    return parsedItem as DownloadFilesData | DownloadFolderData | UploadFileData | UploadFolderData;
  }

  public async cancelTask(taskId: string) {
    const task = this.findTask(taskId);

    this.updateTask({
      taskId,
      merge: {
        status: TaskStatus.Cancelled,
      },
    });

    await (task?.stop ?? (() => undefined))();

    this.eventEmitter.emit(TaskEvent.TaskCancelled, task);
    this.eventEmitter.emit(`${TaskEvent.TaskCancelled}-${taskId}`, task);
  }

  public addListener({
    taskId,
    event,
    listener,
  }: {
    taskId?: string;
    event: TaskEvent;
    listener: (task: TaskData) => void;
  }) {
    const eventKey = taskId ? `${event}-${taskId}` : event;

    this.eventEmitter.addListener(eventKey, listener);
  }

  public removeListener({
    taskId,
    event,
    listener,
  }: {
    taskId?: string;
    event: TaskEvent;
    listener: (task: TaskData) => void;
  }) {
    const eventKey = taskId ? `${event}-${taskId}` : event;

    this.eventEmitter.removeListener(eventKey, listener);
  }

  public removeAllListeners(event: TaskEvent) {
    this.eventEmitter.removeAllListeners(event);
  }

  private getTaskNotificationTitle(task: TaskData): string {
    let title = '';

    switch (task.action) {
      case TaskType.CreateFolder: {
        title = '';
        break;
      }
      case TaskType.DownloadFile: {
        title = itemsLib.getItemDisplayName(task.file);
        break;
      }
      case TaskType.DownloadFolder: {
        title = task.folder.name;
        break;
      }
      case TaskType.DownloadBackup: {
        title = `${task.backup.name}.${task.backup.type}`;
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
        title = itemsLib.getItemDisplayName({ name: task.folder.name });
        break;
      }
      case TaskType.RenameFile: {
        title = itemsLib.getItemDisplayName(task.file);
        break;
      }
      case TaskType.RenameFolder: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { type, ...driveFolderWithoutType } = task.folder;
        title = itemsLib.getItemDisplayName(driveFolderWithoutType);
        break;
      }
    }

    return title;
  }

  private getTaskNotificationSubtitle(task: TaskData): string {
    const isRenameOrMoveTask =
      task.action === TaskType.RenameFolder ||
      task.action === TaskType.RenameFile ||
      task.action === TaskType.MoveFile ||
      task.action === TaskType.MoveFolder;

    if (task.status === TaskStatus.Error && task.subtitle) {
      return task.subtitle;
    }

    if (isRenameOrMoveTask) return t(`tasks.${task.action}.status.${task.status}`);

    return '';
  }

  private getTaskNotificationIcon(task: TaskData): FunctionComponent<SVGProps<SVGSVGElement>> {
    let icon;

    switch (task.action) {
      case TaskType.CreateFolder: {
        icon = iconService.getItemIcon(true, '');
        break;
      }
      case TaskType.DownloadFile: {
        icon = iconService.getItemIcon(false, task.file.type);
        break;
      }
      case TaskType.DownloadFolder: {
        icon = iconService.getItemIcon(false, task.compressionFormat);
        break;
      }
      case TaskType.DownloadBackup: {
        icon = iconService.getItemIcon(false, task.backup.type);
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
      case TaskType.RenameFile: {
        icon = iconService.getItemIcon(false, task.file.type);
        break;
      }
      case TaskType.RenameFolder: {
        icon = iconService.getItemIcon(true, '');
        break;
      }
    }

    return icon;
  }

  private taskFactory<T extends BaseTask>(data: Omit<T, 'id' | 'status' | 'progress'>) {
    const task = {
      ...data,
      id: uniqueId(),
      status: TaskStatus.Pending,
      progress: TaskProgress.Min,
    };

    return task as unknown as TaskData;
  }
}

export default new TaskManagerService();
