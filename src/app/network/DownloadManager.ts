import { queue, QueueObject } from 'async';
import { QueueUtilsService } from 'utils/queueUtils';
import tasksService from 'app/tasks/services/tasks.service';
import { TaskData, TaskEvent, TaskStatus } from 'app/tasks/types';
import { t } from 'i18next';
import errorService from 'services/error.service';
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

  /**
   * Determines if an error is a server error (5xx status codes or specific server error messages)
   * @param error - The error to check
   * @returns True if the error is a server error, false otherwise
   */
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

  /**
   * Processes a download task from the queue
   * Handles the complete download workflow including progress tracking, cancellation, and error handling
   * @param downloadTask - The download task containing items, taskId, and abort controller
   */
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

  /**
   * Handles connection lost errors by updating task status and showing appropriate error message
   * @param err - The connection error
   * @param taskId - The ID of the task that encountered the connection error
   * @throws Rethrows the original error after handling
   */
  private static readonly handleConnectionLostError = (err: unknown, taskId: string) => {
    const subtitle = t('error.connectionLostError');
    tasksService.updateTask({
      taskId,
      merge: { status: TaskStatus.Error, subtitle },
    });
    throw err;
  };

  /**
   * Marks a task as successful
   * @param taskId - The ID of the task to mark as successful
   */
  private static readonly markTaskAsSuccessful = (taskId: string): void => {
    tasksService.updateTask({
      taskId,
      merge: { status: TaskStatus.Success },
    });
  };

  /**
   * Handles retry logic for a download task
   * If retry tasks exist, marks the task as successful
   * Otherwise, removes the successfully downloaded items from retry queue
   * @param downloadTask - The download task to handle retries for
   * @returns True if retry tasks exist, false otherwise
   */
  private static readonly handleRetryLogic = (downloadTask: DownloadTask): boolean => {
    const retryTasks = RetryManager.getTasksById(downloadTask.taskId);
    const hasRetryTasks = retryTasks.length > 0;

    if (hasRetryTasks) {
      this.markTaskAsSuccessful(downloadTask.taskId);
    } else {
      this.removeRetryItems(downloadTask.items, downloadTask);
    }

    return hasRetryTasks;
  };

  /**
   * Determines whether to continue processing after an error occurs
   * @param isServerError - Whether the error is a server error
   * @param filePickerCancelled - Whether the file picker was cancelled
   * @param hasRetryTasks - Whether there are retry tasks available
   * @returns True if processing should continue, false otherwise
   */
  private static readonly shouldContinueAfterError = (
    isServerError: boolean,
    filePickerCancelled: boolean,
    hasRetryTasks: boolean,
  ): boolean => {
    if (!isServerError && !filePickerCancelled) return true;
    if (hasRetryTasks) return false;
    return true;
  };

  /**
   * Shows an error notification to the user if error display is enabled
   * Customizes the error message based on the type of download (file vs folder)
   * @param err - The error that occurred
   * @param downloadTask - The download task that encountered the error
   */
  private static readonly showErrorNotification = (err: unknown, downloadTask: DownloadTask) => {
    if (!downloadTask.options.showErrors) return;

    const { items } = downloadTask;
    const castedError = errorService.castError(err);
    const errorText = items.length > 1 || !items[0].isFolder ? 'error.downloadingFile' : 'error.downloadingFolder';

    notificationsService.show({
      text: t(errorText, { message: castedError.message || '' }),
      type: ToastType.Error,
    });
  };

  /**
   * Handles error processing for active (non-cancelled) tasks
   * Reports the error with context, updates task status if needed, and shows notifications
   * @param err - The error that occurred
   * @param downloadTask - The download task that encountered the error
   * @param updateTaskWithErrorStatus - Whether to update the task status to Error
   */
  private static readonly handleActiveTask = (
    err: unknown,
    downloadTask: DownloadTask,
    updateTaskWithErrorStatus: boolean,
  ) => {
    errorService.reportError(err);

    if (updateTaskWithErrorStatus) {
      tasksService.updateTask({
        taskId: downloadTask.taskId,
        merge: { status: TaskStatus.Error },
      });
    }

    this.showErrorNotification(err, downloadTask);
  };

  /**
   * Main error reporting function that coordinates all error handling logic
   * Determines error type, handles connection issues, and delegates to appropriate handlers
   * @param err - The error that occurred during download
   * @param downloadTask - The download task that encountered the error
   */
  private static readonly reportError = (err: unknown, downloadTask: DownloadTask) => {
    const { taskId } = downloadTask;
    const isConnectionLost = isLostConnectionError(err);
    const isServerError = this.isServerError(err);
    const castedError = errorService.castError(err);
    const filePickerCancelled = castedError.message === ErrorMessages.FilePickerCancelled;

    if (isConnectionLost) {
      this.handleConnectionLostError(err, taskId);
    }

    const shouldHandleRetries = isServerError || filePickerCancelled;
    const hasRetryTasks = shouldHandleRetries ? this.handleRetryLogic(downloadTask) : false;
    const shouldContinueProcessing = this.shouldContinueAfterError(isServerError, filePickerCancelled, hasRetryTasks);
    const task = tasksService.findTask(taskId);

    if (task !== undefined && task.status !== TaskStatus.Cancelled) {
      this.handleActiveTask(err, downloadTask, shouldContinueProcessing);
    } else {
      tasksService.updateTask({
        taskId,
        merge: { status: TaskStatus.Cancelled },
      });
    }
  };

  /**
   * Public method to download a single item (file or folder)
   * Generates a download task and adds it to the download queue
   * @param downloadItem - The item to download
   * @returns The generated download task if successful, undefined otherwise
   */
  static readonly downloadItem = async (downloadItem: DownloadItem) => {
    const newTask = await DownloadManagerService.instance.generateTasksForItem(downloadItem);

    if (newTask) {
      await this.downloadQueue.pushAsync(newTask);
      return newTask;
    }
  };

  /**
   * Removes successfully downloaded items from the retry manager
   * Filters out failed items and removes only the successful ones from retry queue
   * @param items - The items that were attempted for download
   * @param downloadTask - The download task containing information about failed items
   */
  private static readonly removeRetryItems = (items: DownloadItemType[], downloadTask: DownloadTask) => {
    items
      .filter((item) => !downloadTask.failedItems?.some((failedItem) => failedItem.id === item.id))
      .forEach((item) => RetryManager.removeTaskByIdAndParams(downloadTask.taskId, { id: item.id }));
  };
}
