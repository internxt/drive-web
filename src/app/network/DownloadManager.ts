import { queue, QueueObject } from 'async';
import { QueueUtilsService } from 'app/utils/queueUtils';
import tasksService from 'app/tasks/services/tasks.service';
import { TaskData, TaskEvent, TaskStatus } from 'app/tasks/types';
import { ConnectionLostError } from './requests';
import { t } from 'i18next';
import errorService from 'app/core/services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { DownloadItem, DownloadManagerService, DownloadTask } from 'app/drive/services/downloadManager.service';

export class DownloadManager {
  static readonly MAX_CONCURRENT_DOWNLOADS = 6;

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

      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Success,
        },
      });
    } catch (err) {
      this.reportError(err, downloadTask);
    } finally {
      tasksService.removeListener({ event: TaskEvent.TaskCancelled, listener: cancelTaskListener });
    }
  };

  private static readonly reportError = (err: unknown, downloadTask: DownloadTask) => {
    const { items, taskId, abortController } = downloadTask;

    if (err instanceof ConnectionLostError) {
      return tasksService.updateTask({
        taskId,
        merge: { status: TaskStatus.Error, subtitle: t('error.connectionLostError') as string },
      });
    }

    if (abortController?.signal.aborted) {
      return tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Cancelled,
        },
      });
    }

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

    const task = tasksService.findTask(taskId);

    if (task?.status !== TaskStatus.Cancelled) {
      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Error,
        },
      });

      const castedError = errorService.castError(err);

      if (downloadTask.options.showErrors) {
        const errorText = items.length > 1 || !items[0].isFolder ? 'error.downloadingFile' : 'error.downloadingFolder';

        notificationsService.show({
          text: t(errorText, { message: castedError.message || '' }),
          type: ToastType.Error,
        });
      }
      throw castedError;
    }
  };

  static readonly downloadItem = async (downloadItem: DownloadItem) => {
    const newTask = await DownloadManagerService.instance.generateTasksForItem(downloadItem);

    if (newTask) {
      this.downloadQueue.push(newTask);
    }
  };
}
