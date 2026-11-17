import tasksService from 'app/tasks/services/tasks.service';
import { FailedUploadItem, TaskData } from 'app/tasks/types';
import errorService from 'services/error.service';

const TASK_UPDATE_INTERVAL_MS = 100;

/**
 * Updates an upload task in the tasks list. Progress and failed items are sent at most every
 * TASK_UPDATE_INTERVAL_MS, since a big folder produces thousands of them per second; status changes are sent at
 * once, after anything still pending. Failing to update the task never changes how the upload ends.
 */
export class TaskUpdater {
  private pendingProgress?: number;
  private hasPendingFailedItems = false;
  private flushTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly taskId: string,
    private readonly getFailedItems: () => FailedUploadItem[],
  ) {}

  updateProgress(progress: number): void {
    this.pendingProgress = progress;
    this.scheduleFlush();
  }

  updateFailedItems(): void {
    this.hasPendingFailedItems = true;
    this.scheduleFlush();
  }

  update(merge: Partial<TaskData>): void {
    this.flush();
    this.send(merge);
  }

  dropPendingProgress(): void {
    this.pendingProgress = undefined;
  }

  flush(): void {
    clearTimeout(this.flushTimeout);
    this.flushTimeout = undefined;

    const merge: Partial<TaskData> = {};
    if (this.pendingProgress !== undefined) merge.progress = this.pendingProgress;
    if (this.hasPendingFailedItems) merge.failedItems = this.getFailedItems();
    this.pendingProgress = undefined;
    this.hasPendingFailedItems = false;

    const hasSomethingToSend = Object.keys(merge).length > 0;
    if (hasSomethingToSend) this.send(merge);
  }

  private scheduleFlush(): void {
    this.flushTimeout ??= setTimeout(() => this.flush(), TASK_UPDATE_INTERVAL_MS);
  }

  private send(merge: Partial<TaskData>): void {
    try {
      tasksService.updateTask({ taskId: this.taskId, merge });
    } catch (error) {
      errorService.reportError(error);
    }
  }
}
