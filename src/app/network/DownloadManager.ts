import { queue, QueueObject } from 'async';
import { QueueUtilsService } from 'app/utils/queueUtils';
import tasksService from 'app/tasks/services/tasks.service';
import { TaskData, TaskEvent, TaskStatus } from 'app/tasks/types';
import { t } from 'i18next';
import errorService from 'app/core/services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import {
  DownloadItem,
  DownloadItemType,
  DownloadManagerService,
  DownloadTask,
  isLostConnectionError,
  areItemArraysEqual,
} from 'app/drive/services/downloadManager.service';
import RetryManager, { RetryableTask } from './RetryManager';
import { ErrorMessages } from 'app/core/constants';

/**
 * DownloadManager class handles file and folder downloads with queue management
 *
 * @class DownloadManager
 * @static
 *
 * @property {number} MAX_CONCURRENT_DOWNLOADS - Maximum number of concurrent downloads allowed
 * @property {QueueObject<DownloadTask>} downloadQueue - Queue for managing download tasks
 *
 * @method downloadTask - Processes a download task from the queue
 *
 * The download manager:
 * - Manages concurrent downloads based on system performance
 * - Handles file and folder downloads
 * - Provides progress tracking and cancellation support
 * - Integrates with the task service for status updates
 * - Implements memory-aware concurrency adjustment if its needed
 */
export class DownloadManager {
  static readonly MAX_CONCURRENT_DOWNLOADS = 4;

  static readonly downloadQueue: QueueObject<DownloadTask> = queue<DownloadTask>(
    (downloadTask, next: (err?: Error) => void) => {
      if (downloadTask.abortController?.signal.aborted) return next(new Error('Download aborted'));

      const newConcurrency = QueueUtilsService.instance.getConcurrencyUsingPerfomance(
        this.downloadQueue.concurrency,
        DownloadManager.MAX_CONCURRENT_DOWNLOADS,
      );
      if (this.downloadQueue.concurrency !== newConcurrency) {
        this.downloadQueue.concurrency = newConcurrency;
      }

      this.downloadTask(downloadTask)
        .then(() => {
          next();
        })
        .catch((e: Error) => {
          next(e);
        });
    },
    this.MAX_CONCURRENT_DOWNLOADS,
  );

  private static readonly isServerError = (error: unknown): boolean => {
    const castedError = errorService.castError(error);
    return (
      [
        ErrorMessages.ServerUnavailable.toLowerCase(),
        ErrorMessages.ServerError.toLowerCase(),
        ErrorMessages.InternalServerError.toLowerCase(),
      ].includes(castedError.message.toLowerCase() as ErrorMessages) || (castedError.status ?? 0) >= 500
    );
  };

  private static readonly downloadTask = async (downloadTask: DownloadTask) => {
    const { items, taskId, abortController } = downloadTask;

    const task = tasksService.findTask(taskId);
    if (task?.status === TaskStatus.Cancelled || abortController?.signal.aborted) {
      return;
    }

    const cancelTaskListener = (task?: TaskData) => {
      const isCurrentTask = task && task.id === taskId;
      if (isCurrentTask && task.status === TaskStatus.Cancelled) {
        abortController?.abort();
      }
    };
    tasksService.addListener({ event: TaskEvent.TaskCancelled, listener: cancelTaskListener });

    try {
      const updateProgressCallback = (progress: number) => {
        if (task?.status !== TaskStatus.Cancelled) {
          tasksService.updateTask({
            taskId,
            merge: {
              status: TaskStatus.InProcess,
              progress,
            },
          });
        }
      };

      const incrementItemCount = () => {
        if (task?.status !== TaskStatus.Cancelled) {
          tasksService.updateTask({
            taskId,
            merge: {
              status: TaskStatus.InProcess,
              nItems: (task?.nItems ?? 0) + 1,
            },
          });
        }
      };

      tasksService.updateTask({
        taskId: taskId,
        merge: {
          status: TaskStatus.Decrypting,
        },
      });

      if (items.length > 1) {
        await DownloadManagerService.instance.downloadItems(downloadTask, updateProgressCallback, incrementItemCount);
      } else if (items[0].isFolder) {
        await DownloadManagerService.instance.downloadFolder(downloadTask, updateProgressCallback, incrementItemCount);
      } else {
        await DownloadManagerService.instance.downloadFile(downloadTask, updateProgressCallback);
      }

      if (downloadTask.failedItems && downloadTask.failedItems.length > 0) {
        if (areItemArraysEqual(items, downloadTask.failedItems)) {
          tasksService.updateTask({
            taskId,
            merge: {
              status: TaskStatus.Error,
            },
          });
          throw new Error(ErrorMessages.ServerUnavailable);
        }
        const failedTasks = downloadTask.failedItems.map(
          (item) =>
            ({
              taskId: downloadTask.taskId,
              params: item,
              type: 'download',
            }) as RetryableTask,
        );
        RetryManager.addTasks(failedTasks);
      }

      this.removeRetryItems(items, downloadTask);

      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Success,
        },
      });
    } catch (err) {
      this.reportError(err, downloadTask);
      throw err;
    } finally {
      tasksService.removeListener({ event: TaskEvent.TaskCancelled, listener: cancelTaskListener });
    }
  };

  private static readonly reportError = (err: unknown, downloadTask: DownloadTask) => {
    const { items, taskId } = downloadTask;
    const isConnectionLost = isLostConnectionError(err);
    const isServerError = this.isServerError(err);
    const castedError = errorService.castError(err);
    const filePickerCancelled = castedError.message === ErrorMessages.FilePickerCancelled;
    let updateTaskWithErrorStatus = true;

    if (isConnectionLost) {
      tasksService.updateTask({
        taskId,
        merge: { status: TaskStatus.Error, subtitle: t('error.connectionLostError') as string },
      });
      throw err;
    }

    if (isServerError || filePickerCancelled) {
      const retryTasks = RetryManager.getTasksById(downloadTask.taskId);
      if (retryTasks.length > 0) {
        tasksService.updateTask({
          taskId,
          merge: {
            status: TaskStatus.Success,
          },
        });
        updateTaskWithErrorStatus = false;
      } else {
        this.removeRetryItems(items, downloadTask);
      }
    }

    const task = tasksService.findTask(taskId);

    if (task !== undefined && task.status !== TaskStatus.Cancelled) {
      if (items.length > 1) {
        errorService.reportError(err);
      } else {
        const item = items[0];
        if (item.isFolder) {
          errorService.reportError(err, {
            extra: { folder: item.name, bucket: item.bucket, folderParentId: item.parentId },
          });
        } else {
          errorService.reportError(err, {
            extra: { fileName: item.name, bucket: item.bucket, fileSize: item.size, fileType: item.type },
          });
        }
      }
      if (updateTaskWithErrorStatus) {
        tasksService.updateTask({
          taskId,
          merge: {
            status: TaskStatus.Error,
          },
        });
      }

      const castedError = errorService.castError(err);

      if (downloadTask.options.showErrors) {
        const errorText = items.length > 1 || !items[0].isFolder ? 'error.downloadingFile' : 'error.downloadingFolder';

        notificationsService.show({
          text: t(errorText, { message: castedError.message || '' }),
          type: ToastType.Error,
        });
      }
    } else {
      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Cancelled,
        },
      });
    }
  };

  static readonly downloadItem = async (downloadItem: DownloadItem) => {
    const newTask = await DownloadManagerService.instance.generateTasksForItem(downloadItem);

    if (newTask) {
      await this.downloadQueue.pushAsync(newTask);
      return newTask;
    }
  };

  private static readonly removeRetryItems = (items: DownloadItemType[], downloadTask: DownloadTask) => {
    items
      .filter((item) => !downloadTask.failedItems?.some((failedItem) => failedItem.id === item.id))
      .forEach((item) => RetryManager.removeTaskByIdAndParams(downloadTask.taskId, { id: item.id }));
  };
}
