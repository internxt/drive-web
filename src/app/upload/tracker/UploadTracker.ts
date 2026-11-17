import { FileToUpload } from 'app/drive/services/file.service/types';
import { logNetworkInfoForUpload } from 'app/network/networkInformation';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { TaskData, TaskStatus } from 'app/tasks/types';
import { errorMerge } from 'app/tasks/upload/uploadTaskErrors';
import errorService from 'services/error.service';
import referralService from 'services/referral.service';
import { UploadedItem, UploadItem, UploadItemKind } from '../types';
import { UploadFailure } from '../uploadFailure';
import { FailureList } from './FailureList';
import { TaskUpdater } from './TaskUpdater';

export interface UploadTrackerProps {
  uploadRepository: PersistUploadRepository;
  stop: () => void;
  retry: (pickedItem?: UploadItem) => Promise<void>;
  pause: () => void;
  resume: () => void;
  onItemRemoved?: (removedItem: UploadedItem, parentFolderUuid: string) => void;
}

/**
 * Tracks the upload of one item the user picked (a file or a top-level folder), everything inside it and its task.
 * The upload finishes when every item it queued has ended, however many times it was retried.
 */
export abstract class UploadTracker<Item extends UploadItem = UploadItem> {
  protected readonly failures = new FailureList();
  protected isCancelled = false;
  private isPaused = false;
  private pendingItems = 0;
  private finished = Promise.resolve();
  private resolveFinished = () => undefined as void;
  private readonly taskUpdater: TaskUpdater;

  protected constructor(
    readonly item: Item,
    protected readonly props: UploadTrackerProps,
    readonly taskId: string,
  ) {
    this.taskUpdater = new TaskUpdater(taskId, () => this.failures.toFailedItems());
  }

  protected abstract uploadSucceeded(item: UploadItem, uploadedItem: UploadedItem): void;

  protected abstract getUploadedProgress(): number;

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
    if (item === this.item) this.updateProgress(progress);
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
      this.taskUpdater.updateFailedItems();
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
    this.taskUpdater.dropPendingProgress();
  }

  canBePaused(): boolean {
    return !this.hasEnded() && !this.isPaused;
  }

  canBeResumed(): boolean {
    return !this.hasEnded() && this.isPaused;
  }

  pause(): void {
    this.isPaused = true;
    this.taskUpdater.dropPendingProgress();
    this.updateTask({ status: TaskStatus.Paused });
    this.saveUploadState(TaskStatus.Paused);
  }

  resume(): void {
    this.isPaused = false;
    this.updateTask({ status: TaskStatus.InProcess });
    this.saveUploadState(TaskStatus.InProcess);
  }

  takeRetryable(pickedItem?: UploadItem): UploadItem[] {
    if (this.isCancelled) return [];

    const items = this.failures.takeRetryable(pickedItem);
    if (items.length === 0) return [];

    this.taskUpdater.updateFailedItems();
    this.updateTask({
      status: this.isPaused ? TaskStatus.Paused : TaskStatus.InProcess,
      subtitle: undefined,
      progress: this.getUploadedProgress(),
    });
    return items;
  }

  protected updateTask(merge: Partial<TaskData>): void {
    this.taskUpdater.update(merge);
  }

  protected updateProgress(progress: number): void {
    if (!this.isStopped()) this.taskUpdater.updateProgress(progress);
  }

  /**
   * Cancelled, or with nothing left to upload. A paused upload has not ended.
   */
  private hasEnded(): boolean {
    return this.isCancelled || this.pendingItems === 0;
  }

  protected isStopped(): boolean {
    return this.isCancelled || this.isPaused;
  }

  /**
   * The upload worker reads this state to pause or continue the files already uploading.
   */
  protected saveUploadState(status: TaskStatus): void {
    this.props.uploadRepository.setUploadState(this.taskId, status).catch((error) => errorService.reportError(error));
  }

  /**
   * Analytics and the caller's callbacks never change how an upload ends.
   */
  protected reportingErrors(action: () => void): void {
    try {
      action();
    } catch (error) {
      errorService.reportError(error);
    }
  }

  private trackFileUpload(file: FileToUpload): void {
    this.reportingErrors(() => {
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
    if (hadFailed) this.taskUpdater.updateFailedItems();
  }

  private itemEnded(): void {
    this.pendingItems--;
    if (this.pendingItems === 0) void this.finish();
  }

  private async finish(): Promise<void> {
    const resolveFinished = this.resolveFinished;
    try {
      await this.finishUpload();
      this.taskUpdater.flush();
      this.props.uploadRepository.removeUploadState(this.taskId).catch((error) => errorService.reportError(error));
    } catch (error) {
      errorService.reportError(error);
    } finally {
      resolveFinished();
    }
  }
}
