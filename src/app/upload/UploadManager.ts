import { items as itemUtils } from '@internxt/lib';
import { AsyncPriorityQueue, priorityQueue } from 'async';
import errorService from 'services/error.service';
import { QueueUtilsService } from 'utils/queueUtils';
import uploadFile from 'app/drive/services/file.service/uploadFile';
import { DriveFileData } from 'app/drive/types';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { TaskStatus } from 'app/tasks/types';
import {
  MAX_CONCURRENT_UPLOADS,
  MAX_UPLOAD_ATTEMPTS,
  SINGLE_TRANSFER_CONCURRENCY,
  TWENTY_MEGABYTES,
  USE_MULTIPART_THRESHOLD_BYTES,
} from 'app/network/networkConstants';
import { OwnerUserAuthenticationData, UploadFailureReason, UploadItemKind } from 'app/network/types';
import { UploadedItem, UploadFileItem, UploadItem, UploadManagerEvents, UploadResult } from 'app/network/types/upload';
import { canSucceedOnImmediateRetry, toUploadFailure, UploadFailure } from 'app/network/uploadFailure';

enum UploadPriority {
  SmallFile = 1,
  MediumFile = 2,
  LargeFile = 3,
}

interface UploadManagerProps {
  ownerUserAuthenticationData?: OwnerUserAuthenticationData;
  uploadRepository?: PersistUploadRepository;
  getPauseKey: (item: UploadItem) => string;
  events?: UploadManagerEvents;
}

export const createFileItem = (file: File, parentFolderUuid: string): UploadFileItem => {
  const { filename, extension } = itemUtils.getFilenameAndExt(file.name);

  return {
    kind: UploadItemKind.File,
    file: { name: filename, type: extension, size: file.size, content: file, parentFolderId: parentFolderUuid },
  };
};

const isMultipartUpload = (item: UploadItem) => item.file.size >= USE_MULTIPART_THRESHOLD_BYTES;

const isMediumSizedFile = (item: UploadItem) => item.file.size >= TWENTY_MEGABYTES;

const getUploadPriority = (item: UploadItem): UploadPriority => {
  if (isMultipartUpload(item)) return UploadPriority.LargeFile;
  if (isMediumSizedFile(item)) return UploadPriority.MediumFile;
  return UploadPriority.SmallFile;
};

/**
 * Listeners are the caller's code. If one throws, the error is reported but never stops the queue nor turns an
 * uploaded item into a failed one.
 */
const notifyIgnoringListenerErrors = async (notify: () => unknown): Promise<void> => {
  try {
    await notify();
  } catch (error) {
    errorService.reportError(error);
  }
};

/**
 * Uploads files through a single queue. Every item ends either succeeded, failed or cancelled: a failed
 * item never stops the others, except when the storage is full, which fails the pending ones. An item that
 * finishes uploading right after being cancelled is still reported as succeeded, since it does exist in
 * the destination.
 */
export class UploadManager {
  private readonly ownerUserAuthenticationData?: OwnerUserAuthenticationData;
  private readonly uploadRepository?: PersistUploadRepository;
  private readonly getPauseKey: (item: UploadItem) => string;
  private readonly events?: UploadManagerEvents;

  private isEverythingCancelled = false;
  private storageFullFailure?: UploadFailure;
  private readonly cancelledItems = new WeakSet<UploadItem>();
  private readonly abortActiveUploadOf = new Map<UploadItem, () => void>();
  private result: UploadResult = { succeeded: [], failed: [] };

  private readonly uploadQueue: AsyncPriorityQueue<UploadItem> = priorityQueue<UploadItem>((item, done) => {
    this.processItem(item)
      .catch((error) => errorService.reportError(error))
      .finally(() => done());
  }, MAX_CONCURRENT_UPLOADS);

  constructor(props: UploadManagerProps) {
    this.ownerUserAuthenticationData = props.ownerUserAuthenticationData;
    this.uploadRepository = props.uploadRepository;
    this.getPauseKey = props.getPauseKey;
    this.events = props.events;
  }

  async run(items: UploadItem[]): Promise<UploadResult> {
    if (this.uploadQueue.idle()) {
      this.result = { succeeded: [], failed: [] };
      this.storageFullFailure = undefined;
      this.isEverythingCancelled = false;
      this.uploadQueue.concurrency = MAX_CONCURRENT_UPLOADS;
    }

    const hasNothingToUpload = items.length === 0;
    if (hasNothingToUpload) return this.result;

    this.queue(items);
    await this.uploadQueue.drain();

    return this.result;
  }

  cancelAll(): void {
    this.isEverythingCancelled = true;
    this.abortActiveUploadOf.forEach((abort) => abort());
  }

  cancelItem(item: UploadItem): void {
    this.cancelledItems.add(item);
    this.abortActiveUploadOf.get(item)?.();
  }

  private queue(items: UploadItem[]): void {
    for (const item of items) {
      void this.uploadQueue.push(item, getUploadPriority(item));
    }
  }

  private async processItem(item: UploadItem): Promise<void> {
    if (this.isItemCancelled(item)) {
      await notifyIgnoringListenerErrors(() => this.events?.onItemCancelled?.(item));
      return;
    }

    if (this.storageFullFailure) {
      await this.fail(item, this.storageFullFailure);
      return;
    }

    this.adjustConcurrencyFor(item);
    await notifyIgnoringListenerErrors(() => this.events?.onItemStarted?.(item));

    try {
      const uploadedItem = await this.uploadWithRetries(item);
      this.result.succeeded.push({ item, uploadedItem });

      await notifyIgnoringListenerErrors(() => this.events?.onItemSucceeded?.(item, uploadedItem));
    } catch (error) {
      await this.handleUploadError(item, error);
    }
  }

  private adjustConcurrencyFor(item: UploadItem): void {
    if (isMultipartUpload(item)) {
      this.uploadQueue.concurrency = SINGLE_TRANSFER_CONCURRENCY;
      return;
    }

    QueueUtilsService.instance.adjustConcurrency(this.uploadQueue, MAX_CONCURRENT_UPLOADS);
  }

  private async uploadWithRetries(item: UploadItem, attempt = 1): Promise<UploadedItem> {
    try {
      return await this.uploadFile(item);
    } catch (error) {
      const hasAttemptsLeft = attempt < MAX_UPLOAD_ATTEMPTS;
      const shouldRetry = hasAttemptsLeft && !this.isItemCancelled(item) && canSucceedOnImmediateRetry(error);
      if (!shouldRetry) throw error;

      return this.uploadWithRetries(item, attempt + 1);
    }
  }

  private async uploadFile(fileItem: UploadFileItem): Promise<DriveFileData> {
    const pauseKey = this.getPauseKey(fileItem);
    const uploadState = await this.uploadRepository?.getUploadState(pauseKey);
    const isPaused = uploadState === TaskStatus.Paused;

    try {
      const driveFile = await uploadFile(
        fileItem.file,
        (progress) => this.events?.onItemProgress?.(fileItem, progress),
        {
          isTeam: !!this.ownerUserAuthenticationData?.workspaceId,
          ownerUserAuthenticationData: this.ownerUserAuthenticationData,
          abortCallback: (abort) => this.abortActiveUploadOf.set(fileItem, () => abort?.()),
        },
        { taskId: pauseKey, isPaused, isRetriedUpload: false },
      );

      return { ...driveFile, name: fileItem.file.name };
    } finally {
      this.abortActiveUploadOf.delete(fileItem);
    }
  }

  private isItemCancelled(item: UploadItem): boolean {
    return this.isEverythingCancelled || this.cancelledItems.has(item);
  }

  private async handleUploadError(item: UploadItem, error: unknown): Promise<void> {
    if (this.isItemCancelled(item)) {
      await notifyIgnoringListenerErrors(() => this.events?.onItemCancelled?.(item));
      return;
    }

    const failure = toUploadFailure(error);
    const isStorageFull = failure.reason === UploadFailureReason.NoSpaceLeft;
    if (isStorageFull) this.storageFullFailure = failure;

    errorService.reportError(failure.error);
    await this.fail(item, failure);
  }

  private async fail(item: UploadItem, failure: UploadFailure): Promise<void> {
    this.result.failed.push({ item, failure });
    await notifyIgnoringListenerErrors(() => this.events?.onItemFailed?.(item, failure));
  }
}
