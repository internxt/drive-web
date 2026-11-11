import { FileToUpload } from 'app/drive/services/file.service/types';
import { logNetworkInfoForUpload } from 'app/network/networkInformation';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import tasksService from 'app/tasks/services/tasks.service';
import { TaskData, TaskStatus } from 'app/tasks/types';
import { errorMerge } from 'app/tasks/upload/uploadTaskErrors';
import errorService from 'services/error.service';
import referralService from 'services/referral.service';
import { UploadedItem, UploadItem, UploadItemKind } from '../types';
import { UploadFailure } from '../uploadFailure';
import { FailureList } from './FailureList';

export interface UploadTrackerProps {
  uploadRepository: PersistUploadRepository;
  stop: () => void;
  retry: (pickedItem?: UploadItem) => Promise<void>;
  onItemRemoved?: (removedItem: UploadedItem, parentFolderUuid: string) => void;
}

/**
 * Tracks the upload of one item the user picked (a file or a top-level folder), everything inside it and its task.
 * The upload finishes when every item it queued has ended, however many times it was retried.
 */
export abstract class UploadTracker<Item extends UploadItem = UploadItem> {
  protected readonly failures = new FailureList();
  protected isCancelled = false;
  private pendingItems = 0;
  private finished = Promise.resolve();
  private resolveFinished = () => undefined as void;

  protected constructor(
    readonly item: Item,
    protected readonly props: UploadTrackerProps,
    readonly taskId: string,
  ) {}

  protected abstract uploadSucceeded(item: UploadItem, uploadedItem: UploadedItem): void;

  protected abstract getRetryProgress(): number;

  protected abstract finishUpload(): void | Promise<void>;

  onQueued(): void {
    const isUploadStarting = this.pendingItems === 0;
    if (isUploadStarting) this.waitForNewFinish();
    this.pendingItems++;
  }

  onStarted(item: UploadItem): void {
    if (item === this.item) this.updateTask({ status: TaskStatus.InProcess });
  }

  onProgress(item: UploadItem, progress: number): void {
    if (item === this.item && !this.isStopped()) this.updateTask({ progress });
  }

  onSucceeded(item: UploadItem, uploadedItem: UploadedItem): void {
    try {
      this.uploadSucceeded(item, uploadedItem);
      this.removeFailure(item);
      if (item.kind === UploadItemKind.File) this.trackFileUpload(item.file);
    } finally {
      this.itemEnded();
    }
  }

  onFailed(item: UploadItem, failure: UploadFailure): void {
    try {
      this.failures.add(item, failure, () => this.props.retry(item));
      this.syncFailedItems();
      if (item === this.item) this.updateTask(errorMerge(failure.reason));
    } finally {
      this.itemEnded();
    }
  }

  onCancelled(item: UploadItem): void {
    try {
      this.removeFailure(item);
      const isOwnFile = item === this.item && item.kind === UploadItemKind.File;
      if (isOwnFile) this.updateTask({ status: TaskStatus.Cancelled });
    } finally {
      this.itemEnded();
    }
  }

  whenFinished(): Promise<void> {
    return this.finished;
  }

  cancel(): void {
    this.isCancelled = true;
  }

  takeRetryable(pickedItem?: UploadItem): UploadItem[] {
    if (this.isCancelled) return [];

    const items = this.failures.takeRetryable(pickedItem);
    if (items.length === 0) return [];

    this.syncFailedItems();
    this.updateTask({ status: TaskStatus.InProcess, subtitle: undefined, progress: this.getRetryProgress() });
    return items;
  }

  protected updateTask(merge: Partial<TaskData>): void {
    tasksService.updateTask({ taskId: this.taskId, merge });
  }

  protected isStopped(): boolean {
    return this.isCancelled || tasksService.findTask(this.taskId)?.status === TaskStatus.Paused;
  }

  /**
   * Analytics never make an upload fail.
   */
  protected track(trackUpload: () => void): void {
    try {
      trackUpload();
    } catch (error) {
      errorService.reportError(error);
    }
  }

  private trackFileUpload(file: FileToUpload): void {
    this.track(() => {
      referralService.trackFileUpload();
      logNetworkInfoForUpload({ fileName: file.name, fileSize: file.size });
    });
  }

  private waitForNewFinish(): void {
    this.finished = new Promise((resolve) => {
      this.resolveFinished = resolve;
    });
  }

  private removeFailure(item: UploadItem): void {
    const hadFailed = this.failures.remove(item);
    if (hadFailed) this.syncFailedItems();
  }

  private syncFailedItems(): void {
    this.updateTask({ failedItems: this.failures.toFailedItems() });
  }

  private itemEnded(): void {
    this.pendingItems--;
    if (this.pendingItems === 0) void this.finish();
  }

  private async finish(): Promise<void> {
    const resolveFinished = this.resolveFinished;
    try {
      await this.finishUpload();
      this.props.uploadRepository.removeUploadState(this.taskId).catch((error) => errorService.reportError(error));
    } catch (error) {
      errorService.reportError(error);
    } finally {
      resolveFinished();
    }
  }
}
