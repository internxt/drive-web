import { items as itemUtils } from '@internxt/lib';
import { AsyncPriorityQueue, priorityQueue } from 'async';
import errorService from 'services/error.service';
import workspacesService from 'services/workspace.service';
import { QueueUtilsService } from 'utils/queueUtils';
import { wait } from 'utils/timeUtils';
import uploadFile from 'app/drive/services/file.service/uploadFile';
import folderService from 'app/drive/services/folder.service';
import { toDriveFolderData } from 'app/drive/services/folder.service/toDriveFolderData';
import { DriveFileData, DriveFolderData } from 'app/drive/types';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { IRoot } from 'app/store/slices/storage/types';
import { TaskStatus } from 'app/tasks/types';
import {
  MAX_CONCURRENT_UPLOADS,
  MAX_UPLOAD_ATTEMPTS,
  SINGLE_TRANSFER_CONCURRENCY,
  TWENTY_MEGABYTES,
  USE_MULTIPART_THRESHOLD_BYTES,
  WORKSPACE_FOLDER_AVAILABILITY_DELAY_MS,
} from 'app/network/networkConstants';
import { OwnerUserAuthenticationData, UploadFailureReason, UploadItemKind } from 'app/network/types';
import {
  UploadedItem,
  UploadFileItem,
  UploadFolderItem,
  UploadItem,
  UploadManagerEvents,
  UploadResult,
} from 'app/network/types/upload';
import { canSucceedOnImmediateRetry, toUploadFailure, UploadFailure } from 'app/network/uploadFailure';

enum UploadPriority {
  Folder = 0,
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

export const createFileItem = (file: File, parentFolderUuid: string, parent?: UploadFolderItem): UploadFileItem => {
  const { filename, extension } = itemUtils.getFilenameAndExt(file.name);

  return {
    kind: UploadItemKind.File,
    file: { name: filename, type: extension, size: file.size, content: file, parentFolderId: parentFolderUuid },
    parent,
  };
};

export const createFolderItem = (
  folder: IRoot,
  parentFolderUuid: string,
  parent?: UploadFolderItem,
): UploadFolderItem => ({
  kind: UploadItemKind.Folder,
  folder,
  parentFolderUuid,
  parent,
});

const getItemAndItsFolders = (item: UploadItem): UploadItem[] => {
  const itemAndItsFolders: UploadItem[] = [];
  for (let current: UploadItem | undefined = item; current; current = current.parent) {
    itemAndItsFolders.push(current);
  }
  return itemAndItsFolders;
};

const isPartOf = (item: UploadItem, otherItem: UploadItem): boolean => getItemAndItsFolders(item).includes(otherItem);

const isFolderItem = (item: UploadItem): item is UploadFolderItem => item.kind === UploadItemKind.Folder;

const isMultipartUpload = (item: UploadItem) =>
  item.kind === UploadItemKind.File && item.file.size >= USE_MULTIPART_THRESHOLD_BYTES;

const isMediumSizedFile = (item: UploadItem) => item.kind === UploadItemKind.File && item.file.size >= TWENTY_MEGABYTES;

const getUploadPriority = (item: UploadItem): UploadPriority => {
  if (isFolderItem(item)) return UploadPriority.Folder;
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
 * Uploads files and folders through a single queue. A folder is created first and its content is then
 * queued into it. Large files wait until every folder has queued its content, so the small files found
 * later never end up uploading one at a time behind them. Every item ends either succeeded, failed or
 * cancelled: a failed item never stops the others, except when the storage is full, which fails the pending
 * ones. An item that finishes uploading right after being cancelled is still reported as succeeded, since it
 * does exist in the destination.
 */
export class UploadManager {
  private readonly ownerUserAuthenticationData?: OwnerUserAuthenticationData;
  private readonly uploadRepository?: PersistUploadRepository;
  private readonly getPauseKey: (item: UploadItem) => string;
  private readonly events?: UploadManagerEvents;

  private storageFullFailure?: UploadFailure;
  private foldersStillQueueingContent = 0;
  private readonly largeFilesWaitingForFolders: UploadItem[] = [];
  private readonly cancelledItems = new WeakSet<UploadItem>();
  private readonly abortActiveUploadOf = new Map<UploadItem, () => void>();
  private result: UploadResult = { succeeded: [], failed: [] };

  private readonly uploadQueue: AsyncPriorityQueue<UploadItem> = priorityQueue<UploadItem>((item, done) => {
    this.processItem(item)
      .catch((error) => errorService.reportError(error))
      .finally(() => {
        if (isFolderItem(item)) this.finishFolder();
        done();
      });
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
      this.uploadQueue.concurrency = MAX_CONCURRENT_UPLOADS;
    }

    const hasNothingToUpload = items.length === 0;
    if (hasNothingToUpload) return this.result;

    this.queue(items);
    await this.uploadQueue.drain();

    return this.result;
  }

  cancelItem(item: UploadItem): void {
    this.cancelledItems.add(item);
    this.abortActiveUploadsPartOf(item);
  }

  private queue(items: UploadItem[]): void {
    for (const item of items) {
      if (isFolderItem(item)) this.foldersStillQueueingContent++;
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

    const shouldWaitForFolders = isMultipartUpload(item) && this.foldersStillQueueingContent > 0;
    if (shouldWaitForFolders) {
      this.largeFilesWaitingForFolders.push(item);
      return;
    }

    this.adjustConcurrencyFor(item);
    await notifyIgnoringListenerErrors(() => this.events?.onItemStarted?.(item));

    try {
      const uploadedItem = await this.uploadWithRetries(item);
      this.result.succeeded.push({ item, uploadedItem });

      const shouldQueueFolderContent = isFolderItem(item) && !this.isItemCancelled(item);
      if (shouldQueueFolderContent) {
        await this.queueFolderContent(item, uploadedItem as DriveFolderData);
      }

      await notifyIgnoringListenerErrors(() => this.events?.onItemSucceeded?.(item, uploadedItem));
    } catch (error) {
      await this.handleUploadError(item, error);
    }
  }

  private finishFolder(): void {
    this.foldersStillQueueingContent--;

    const haveAllFoldersQueuedTheirContent = this.foldersStillQueueingContent === 0;
    if (haveAllFoldersQueuedTheirContent) this.queue(this.largeFilesWaitingForFolders.splice(0));
  }

  private adjustConcurrencyFor(item: UploadItem): void {
    if (isMultipartUpload(item)) {
      this.uploadQueue.concurrency = SINGLE_TRANSFER_CONCURRENCY;
      return;
    }

    QueueUtilsService.instance.adjustConcurrency(this.uploadQueue, MAX_CONCURRENT_UPLOADS);
  }

  private async queueFolderContent(folderItem: UploadFolderItem, createdFolder: DriveFolderData): Promise<void> {
    const { childrenFolders, childrenFiles } = folderItem.folder;
    const isFolderEmpty = childrenFolders.length === 0 && childrenFiles.length === 0;
    if (isFolderEmpty) return;

    await this.waitUntilWorkspaceFolderIsAvailable();

    this.queue([
      ...childrenFolders.map((childFolder) => createFolderItem(childFolder, createdFolder.uuid, folderItem)),
      ...childrenFiles.map((childFile) => createFileItem(childFile, createdFolder.uuid, folderItem)),
    ]);
  }

  private async waitUntilWorkspaceFolderIsAvailable(): Promise<void> {
    const isWorkspaceUpload = !!this.ownerUserAuthenticationData?.workspaceId;
    if (isWorkspaceUpload) await wait(WORKSPACE_FOLDER_AVAILABILITY_DELAY_MS);
  }

  private async uploadWithRetries(item: UploadItem, attempt = 1): Promise<UploadedItem> {
    try {
      return await this.uploadItem(item);
    } catch (error) {
      const hasAttemptsLeft = attempt < MAX_UPLOAD_ATTEMPTS;
      const shouldRetry = hasAttemptsLeft && !this.isItemCancelled(item) && canSucceedOnImmediateRetry(error);
      if (!shouldRetry) throw error;

      return this.uploadWithRetries(item, attempt + 1);
    }
  }

  private uploadItem(item: UploadItem): Promise<UploadedItem> {
    if (isFolderItem(item)) return this.createFolder(item);
    return this.uploadFile(item);
  }

  private async createFolder(folderItem: UploadFolderItem): Promise<DriveFolderData> {
    const workspaceId = this.ownerUserAuthenticationData?.workspaceId;
    const { parentFolderUuid, folder } = folderItem;
    const [createdFolderPromise, requestCanceler] = workspaceId
      ? workspacesService.createFolder({ workspaceId, parentFolderUuid, plainName: folder.name })
      : folderService.createFolderByUuid(parentFolderUuid, folder.name);

    this.abortActiveUploadOf.set(folderItem, () => requestCanceler.cancel());

    try {
      const createdFolder = await createdFolderPromise;
      return toDriveFolderData(createdFolder, folder.name);
    } finally {
      this.abortActiveUploadOf.delete(folderItem);
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
    return getItemAndItsFolders(item).some((itemOrFolder) => this.cancelledItems.has(itemOrFolder));
  }

  private abortActiveUploadsPartOf(cancelledItem: UploadItem): void {
    this.abortActiveUploadOf.forEach((abort, activeItem) => {
      if (isPartOf(activeItem, cancelledItem)) abort();
    });
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
