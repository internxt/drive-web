import { items as itemsLib } from '@internxt/lib';
import { FunctionComponent, SVGProps } from 'react';

import {
  TaskManagerEvent,
  TaskProgress,
  TaskStatus,
  TaskType,
  TaskNotification,
  TaskData,
  TaskFilter,
  UpdateTaskPayload,
} from '../../types';
import iconService from '../../../drive/services/icon.service';
import EventEmitter from 'events';
import i18n from '../../../i18n/services/i18n.service';

class TaskManagerService {
  private tasks: TaskData[];
  private eventEmitter: EventEmitter;

  constructor() {
    this.tasks = [];
    this.eventEmitter = new EventEmitter();
  }

  public addTask(task: TaskData) {
    this.tasks.push(task);

    this.eventEmitter.emit(TaskManagerEvent.TaskAdded, task);
  }

  public updateTask(patch: UpdateTaskPayload) {
    const taskToUpdate = this.tasks.find((task) => task.id === patch.taskId);

    Object.assign(taskToUpdate, patch.merge);

    this.eventEmitter.emit(TaskManagerEvent.TaskUpdated, taskToUpdate);
  }

  public clearTasks() {
    this.tasks = [];
  }

  public getTasks(filter: TaskFilter = {}) {
    return this.tasks.filter((task) => {
      const meetsTheStatus = !filter.status || filter.status.includes(task.status);
      const meetsTheRelatedTaskId = !filter.relatedTaskId || task.relatedTaskId === filter.relatedTaskId;

      return meetsTheStatus && meetsTheRelatedTaskId;
    });
  }

  public findTask(taskId: string) {
    return this.tasks.find((task) => task.id === taskId);
  }

  public isTaskFinished(taskId: string) {
    return [TaskStatus.Error, TaskStatus.Success, TaskStatus.Cancelled].includes(
      this.tasks.find((task) => task.id === taskId)?.status || TaskStatus.Pending,
    );
  }

  public isTaskProgressCompleted(taskId: string) {
    return this.tasks.find((task) => task.id === taskId)?.progress === TaskProgress.Max;
  }

  public getNotifications(filter: TaskFilter = {}) {
    return this.getTasks(filter)
      .filter((task) => task.showNotification)
      .map((task) => this.findNotification(task))
      .reverse();
  }

  public findNotification(task: TaskData): TaskNotification {
    return {
      taskId: task.id,
      status: task.status,
      title: this.getTaskNotificationTitle(task),
      subtitle: this.getTaskNotificationSubtitle(task),
      icon: this.getTaskNotificationIcon(task),
      progress: task.progress,
      isTaskCancellable: task.cancellable,
    };
  }

  public cancelTask(taskId: string) {
    this.updateTask({
      taskId,
      merge: {
        status: TaskStatus.Cancelled,
      },
    });

    // await (taskManagerSelectors.findTaskById(getState())(taskId)?.stop || (() => undefined))();

    this.eventEmitter.emit(TaskManagerEvent.TaskCancelled);
  }

  public addListener(event: TaskManagerEvent, listener: () => void) {
    this.eventEmitter.addListener(event, listener);
  }

  public removeListener(event: TaskManagerEvent, listener: () => void) {
    this.eventEmitter.removeListener(event, listener);
  }

  public removeAllListeners(event: TaskManagerEvent) {
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
        title = itemsLib.getItemDisplayName(task.folder);
        break;
      }
    }

    return title;
  }

  private getTaskNotificationSubtitle(task: TaskData): string {
    return i18n.get(`tasks.${task.action}.status.${task.status}`, {
      progress: task.progress ? (task.progress * 100).toFixed(2) : 0,
    });
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
    }

    return icon;
  }
}

export default new TaskManagerService();
