import { AsyncPriorityQueue, priorityQueue } from 'async';
import errorService from 'services/error.service';
import workspacesService from 'services/workspace.service';
import { QueueUtilsService } from 'utils/queueUtils';
import { wait } from 'utils/timeUtils';
import uploadFile from 'app/drive/services/file.service/uploadFile';
import folderService from 'app/drive/services/folder.service';
import newStorageService from 'app/drive/services/new-storage.service';
import { toDriveFolderData } from 'app/drive/services/folder.service/toDriveFolderData';
import { DriveFileData, DriveFolderData } from 'app/drive/types';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { TaskStatus } from 'app/tasks/types';
import {
  MAX_CONCURRENT_UPLOADS,
  MAX_UPLOAD_ATTEMPTS,
  TWENTY_MEGABYTES,
  UPLOAD_IDLE_TIMEOUT_MS,
  USE_MULTIPART_THRESHOLD_BYTES,
} from 'app/network/networkConstants';
import { OwnerUserAuthenticationData } from 'app/network/types';
import {
  UploadedItem,
  UploadFailureReason,
  UploadFileItem,
  UploadFolderItem,
  UploadItem,
  UploadItemKind,
  UploadManagerEvents,
  UploadResult,
} from './types';
import { shouldAutoRetry, toUploadFailure, UploadFailure } from './uploadFailure';
import {
  createFileItem,
  createFolderItem,
  getItemAndItsFolders,
  getTopLevelItem,
  isFolderItem,
  isPartOf,
} from './uploadItemTree';

const SINGLE_TRANSFER_CONCURRENCY = 1;
export const WORKSPACE_FOLDER_AVAILABILITY_DELAY_MS = 600;
export const FOLDER_CREATION_TIMEOUT_MS = UPLOAD_IDLE_TIMEOUT_MS;
const EXISTING_FOLDER_LOOKUP_ATTEMPTS = 3;

enum UploadPriority {
  Folder = 0,
  SmallFile = 1,
  MediumFile = 2,
  LargeFile = 3,
}

export interface UploadRunOptions {
  ownerUserAuthenticationData?: OwnerUserAuthenticationData;
  uploadRepository?: PersistUploadRepository;
  getPauseKey: (item: UploadItem) => string;
  events?: UploadManagerEvents;
}

/**
 * What the engine keeps for each upload. An upload and its retries run with the same options, so they share it.
 */
interface UploadInProgress {
  options: UploadRunOptions;
  foldersStillQueueingContent: number;
  largeFilesWaitingForFolders: UploadItem[];
}

const OWN_STORAGE = 'own-storage';

const getStorageOf = (ownerUserAuthenticationData?: OwnerUserAuthenticationData): string =>
  ownerUserAuthenticationData?.bucketId ?? OWN_STORAGE;

class UploadCancelledError extends Error {
  constructor() {
    super('The upload was cancelled before it started');
  }
}

class FolderCreationTimeoutError extends Error {
  constructor() {
    super('Creating the folder did not answer in time');
  }
}

/**
 * The server didn't say whether the folder was created: no answer, a timeout or a server error.
 */
const isUnknownCreationResult = (error: unknown) =>
  error instanceof FolderCreationTimeoutError ||
  errorService.isNetworkError(error) ||
  errorService.isServerError(error);

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
 * queued into it. Large files wait until every folder of their upload has queued its content, so the small
 * files found later never end up uploading one at a time behind them. Every item ends either succeeded, failed or
 * cancelled: a failed item never stops the others, except when the storage is full, which fails the pending
 * ones. An item that finishes uploading right after being cancelled is still reported as succeeded, since it
 * does exist in the destination. The items of a paused upload wait without starting until it is resumed.
 */
export class UploadManager {
  private readonly uploadByOptions = new WeakMap<UploadRunOptions, UploadInProgress>();
  private readonly uploadByTopLevelItem = new WeakMap<UploadItem, UploadInProgress>();
  private readonly foldersWithUnknownCreation = new WeakSet<UploadFolderItem>();
  private readonly storageFullFailureByStorage = new Map<string, UploadFailure>();
  private readonly cancelledItems = new WeakSet<UploadItem>();
  private readonly abortActiveUploadOf = new Map<UploadItem, () => void>();
  private readonly pausedUploads = new WeakSet<UploadItem>();
  private readonly itemsWaitingForResumeOf = new Map<UploadItem, UploadItem[]>();
  private result: UploadResult = { succeeded: [], failed: [] };

  private readonly uploadQueue: AsyncPriorityQueue<UploadItem> = priorityQueue<UploadItem>((item, done) => {
    this.processItem(item)
      .catch((error) => errorService.reportError(error))
      .finally(() => {
        if (isFolderItem(item)) this.finishFolder(item);
        done();
      });
  }, MAX_CONCURRENT_UPLOADS);

  async run(items: UploadItem[], options: UploadRunOptions): Promise<UploadResult> {
    if (this.uploadQueue.idle()) {
      this.result = { succeeded: [], failed: [] };
      this.storageFullFailureByStorage.clear();
      this.uploadQueue.concurrency = MAX_CONCURRENT_UPLOADS;
    }

    const hasNothingToUpload = items.length === 0;
    if (hasNothingToUpload) return this.result;

    const upload = this.getUploadRunningWith(options);
    for (const item of items) this.uploadByTopLevelItem.set(getTopLevelItem(item), upload);

    this.queue(items);
    await this.uploadQueue.drain();

    return this.result;
  }

  cancelItem(item: UploadItem): void {
    this.cancelledItems.add(item);
    this.abortActiveUploadsPartOf(item);
    this.releaseItemsWaitingForResume(getTopLevelItem(item));
  }

  /**
   * The items of the upload that have not started yet wait until it is resumed, and `run` doesn't wait for them:
   * they end later, through the events. The ones already uploading keep going: pausing them is up to the upload
   * worker.
   */
  pause(topLevelItem: UploadItem): void {
    this.pausedUploads.add(topLevelItem);
  }

  resume(topLevelItem: UploadItem): void {
    this.pausedUploads.delete(topLevelItem);
    this.releaseItemsWaitingForResume(topLevelItem);
  }

  clearStorageFull(ownerUserAuthenticationData?: OwnerUserAuthenticationData): void {
    this.storageFullFailureByStorage.delete(getStorageOf(ownerUserAuthenticationData));
  }

  private queue(items: UploadItem[]): void {
    for (const item of items) {
      void notifyIgnoringListenerErrors(() => this.getEventsOf(item)?.onItemQueued?.(item));
      this.pushToQueue(item);
    }
  }

  private pushToQueue(item: UploadItem): void {
    if (isFolderItem(item)) this.getUploadOf(item).foldersStillQueueingContent++;
    void this.uploadQueue.push(item, getUploadPriority(item));
  }

  private async processItem(item: UploadItem): Promise<void> {
    if (this.isItemCancelled(item)) {
      await notifyIgnoringListenerErrors(() => this.getEventsOf(item)?.onItemCancelled?.(item));
      return;
    }

    const topLevelItem = getTopLevelItem(item);
    if (this.pausedUploads.has(topLevelItem)) {
      this.waitForResume(topLevelItem, item);
      return;
    }

    const storageFullFailure = this.storageFullFailureByStorage.get(this.getStorageOf(item));
    if (storageFullFailure) {
      await this.fail(item, storageFullFailure);
      return;
    }

    const upload = this.getUploadOf(item);
    const shouldWaitForFolders = isMultipartUpload(item) && upload.foldersStillQueueingContent > 0;
    if (shouldWaitForFolders) {
      upload.largeFilesWaitingForFolders.push(item);
      return;
    }

    this.adjustConcurrencyFor(item);
    await notifyIgnoringListenerErrors(() => this.getEventsOf(item)?.onItemStarted?.(item));

    try {
      const uploadedItem = await this.uploadWithRetries(item);
      this.result.succeeded.push({ item, uploadedItem });

      const shouldQueueFolderContent = isFolderItem(item) && !this.isItemCancelled(item);
      if (shouldQueueFolderContent) {
        await this.queueFolderContent(item, uploadedItem as DriveFolderData);
      }

      await notifyIgnoringListenerErrors(() => this.getEventsOf(item)?.onItemSucceeded?.(item, uploadedItem));
    } catch (error) {
      await this.handleUploadError(item, error);
    }
  }

  private finishFolder(folderItem: UploadFolderItem): void {
    const upload = this.getUploadOf(folderItem);
    upload.foldersStillQueueingContent--;

    const haveAllFoldersQueuedTheirContent = upload.foldersStillQueueingContent === 0;
    if (haveAllFoldersQueuedTheirContent) {
      upload.largeFilesWaitingForFolders.splice(0).forEach((largeFile) => this.pushToQueue(largeFile));
    }
  }

  private waitForResume(topLevelItem: UploadItem, item: UploadItem): void {
    const waitingItems = this.itemsWaitingForResumeOf.get(topLevelItem) ?? [];
    waitingItems.push(item);
    this.itemsWaitingForResumeOf.set(topLevelItem, waitingItems);
  }

  private releaseItemsWaitingForResume(topLevelItem: UploadItem): void {
    const waitingItems = this.itemsWaitingForResumeOf.get(topLevelItem);
    if (!waitingItems) return;

    this.itemsWaitingForResumeOf.delete(topLevelItem);
    waitingItems.forEach((item) => this.pushToQueue(item));
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

    await this.waitUntilWorkspaceFolderIsAvailable(folderItem);

    this.queue([
      ...childrenFolders.map((childFolder) => createFolderItem(childFolder, createdFolder.uuid, folderItem)),
      ...childrenFiles.map((childFile) => createFileItem(childFile, createdFolder.uuid, folderItem)),
    ]);
  }

  private async waitUntilWorkspaceFolderIsAvailable(folderItem: UploadFolderItem): Promise<void> {
    const isWorkspaceUpload = !!this.getOptionsOf(folderItem).ownerUserAuthenticationData?.workspaceId;
    if (isWorkspaceUpload) await wait(WORKSPACE_FOLDER_AVAILABILITY_DELAY_MS);
  }

  private async uploadWithRetries(item: UploadItem, attempt = 1): Promise<UploadedItem> {
    try {
      return await this.uploadItem(item);
    } catch (error) {
      const hasAttemptsLeft = attempt < MAX_UPLOAD_ATTEMPTS;
      const shouldRetry = hasAttemptsLeft && !this.isItemCancelled(item) && shouldAutoRetry(toUploadFailure(error));
      if (!shouldRetry) throw error;

      return this.uploadWithRetries(item, attempt + 1);
    }
  }

  private uploadItem(item: UploadItem): Promise<UploadedItem> {
    if (isFolderItem(item)) return this.createFolder(item);
    return this.uploadFile(item);
  }

  /**
   * Creating a folder is idempotent: when an attempt ends without knowing whether the folder was created (a lost
   * response, a timeout) and the next one finds it already exists, the existing one is used. A folder that already
   * exists on the first attempt belongs to the user, so it is never reused.
   */
  private async createFolder(folderItem: UploadFolderItem): Promise<DriveFolderData> {
    this.throwIfCancelled(folderItem);

    try {
      const createdFolder = await this.requestFolderCreation(folderItem);
      return toDriveFolderData(createdFolder, folderItem.folder.name);
    } catch (error) {
      if (!errorService.isConflictError(error)) {
        if (isUnknownCreationResult(error)) this.foldersWithUnknownCreation.add(folderItem);
        throw error;
      }

      const mayHaveBeenCreatedByAPreviousAttempt = this.foldersWithUnknownCreation.has(folderItem);
      if (!mayHaveBeenCreatedByAPreviousAttempt) throw error;

      return this.findExistingFolder(folderItem, error);
    }
  }

  private async requestFolderCreation(folderItem: UploadFolderItem) {
    const workspaceId = this.getOptionsOf(folderItem).ownerUserAuthenticationData?.workspaceId;
    const { parentFolderUuid, folder } = folderItem;
    const [createdFolderPromise, requestCanceler] = workspaceId
      ? workspacesService.createFolder({ workspaceId, parentFolderUuid, plainName: folder.name })
      : folderService.createFolderByUuid(parentFolderUuid, folder.name);

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        requestCanceler.cancel();
        reject(new FolderCreationTimeoutError());
      }, FOLDER_CREATION_TIMEOUT_MS);
    });

    try {
      return await Promise.race([createdFolderPromise, timedOut]);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async findExistingFolder(folderItem: UploadFolderItem, conflictError: unknown): Promise<DriveFolderData> {
    const { parentFolderUuid, folder } = folderItem;

    for (let attempt = 1; attempt <= EXISTING_FOLDER_LOOKUP_ATTEMPTS; attempt++) {
      this.throwIfCancelled(folderItem);
      const { existentFolders } = await newStorageService.checkDuplicatedFolders(parentFolderUuid, [folder.name]);
      const [existingFolder] = existentFolders;
      if (existingFolder) return { ...existingFolder, name: folder.name, isFolder: true };

      const hasLookupsLeft = attempt < EXISTING_FOLDER_LOOKUP_ATTEMPTS;
      if (hasLookupsLeft) await wait(WORKSPACE_FOLDER_AVAILABILITY_DELAY_MS);
    }

    throw conflictError;
  }

  private async uploadFile(fileItem: UploadFileItem): Promise<DriveFileData> {
    const { ownerUserAuthenticationData, uploadRepository, getPauseKey, events } = this.getOptionsOf(fileItem);
    const pauseKey = getPauseKey(fileItem);
    const uploadState = await uploadRepository?.getUploadState(pauseKey);
    const isPaused = uploadState === TaskStatus.Paused;
    this.throwIfCancelled(fileItem);

    try {
      const driveFile = await uploadFile(
        fileItem.file,
        (progress) => events?.onItemProgress?.(fileItem, progress),
        {
          isTeam: !!ownerUserAuthenticationData?.workspaceId,
          ownerUserAuthenticationData,
          abortCallback: (abort) => this.abortActiveUploadOf.set(fileItem, () => abort?.()),
        },
        { taskId: pauseKey, isPaused, isRetriedUpload: false },
      );

      return { ...driveFile, name: fileItem.file.name };
    } finally {
      this.abortActiveUploadOf.delete(fileItem);
    }
  }

  private getUploadRunningWith(options: UploadRunOptions): UploadInProgress {
    const runningUpload = this.uploadByOptions.get(options);
    if (runningUpload) return runningUpload;

    const upload: UploadInProgress = { options, foldersStillQueueingContent: 0, largeFilesWaitingForFolders: [] };
    this.uploadByOptions.set(options, upload);
    return upload;
  }

  private getUploadOf(item: UploadItem): UploadInProgress {
    return this.uploadByTopLevelItem.get(getTopLevelItem(item)) as UploadInProgress;
  }

  private getOptionsOf(item: UploadItem): UploadRunOptions {
    return this.getUploadOf(item).options;
  }

  private getEventsOf(item: UploadItem): UploadManagerEvents | undefined {
    return this.getOptionsOf(item).events;
  }

  private getStorageOf(item: UploadItem): string {
    return getStorageOf(this.getOptionsOf(item).ownerUserAuthenticationData);
  }

  private throwIfCancelled(item: UploadItem): void {
    if (this.isItemCancelled(item)) throw new UploadCancelledError();
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
      await notifyIgnoringListenerErrors(() => this.getEventsOf(item)?.onItemCancelled?.(item));
      return;
    }

    const failure = toUploadFailure(error);
    const isStorageFull = failure.reason === UploadFailureReason.NoSpaceLeft;
    const storage = this.getStorageOf(item);
    const isFirstTimeStorageIsFull = isStorageFull && !this.storageFullFailureByStorage.has(storage);
    if (isFirstTimeStorageIsFull) {
      this.storageFullFailureByStorage.set(storage, failure);
      await notifyIgnoringListenerErrors(() => this.getEventsOf(item)?.onStorageFull?.());
    }

    errorService.reportError(failure.error);
    await this.fail(item, failure);
  }

  private async fail(item: UploadItem, failure: UploadFailure): Promise<void> {
    this.result.failed.push({ item, failure });
    await notifyIgnoringListenerErrors(() => this.getEventsOf(item)?.onItemFailed?.(item, failure));
  }
}

export const uploadManager = new UploadManager();
