import newStorageService from 'app/drive/services/new-storage.service';
import { DriveFolderData } from 'app/drive/types';
import { logNetworkInfoForUpload } from 'app/network/networkInformation';
import { OwnerUserAuthenticationData } from 'app/network/types';
import {
  UploadedItem,
  UploadFileItem,
  UploadFolderItem,
  UploadItem,
  UploadItemKind,
  UploadManagerEvents,
  UploadResult,
} from 'app/upload/types';
import { UploadFailure } from 'app/upload/uploadFailure';
import { createFileItem, createFolderItem, UploadManager } from './UploadManager';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { IRoot } from 'app/store/slices/storage/types';
import tasksService from 'app/tasks/services/tasks.service';
import { FailedUploadItem, TaskStatus, TaskType, UploadFileTask, UploadFolderTask } from 'app/tasks/types';
import { errorMerge } from 'app/tasks/upload/uploadTaskErrors';
import errorService from 'services/error.service';
import referralService from 'services/referral.service';
import { uniqueId } from 'utils/lodash';
import { toFailedUploadItem } from './failedUploadItem';

interface UploadProps {
  destinationFolderUuid: string;
  roots: IRoot[];
  files: File[];
  ownerUserAuthenticationData?: OwnerUserAuthenticationData;
  uploadRepository: PersistUploadRepository;
  onItemUploaded?: (uploadedItem: UploadedItem, parentFolderUuid: string, isFolder: boolean) => void;
  onItemRemoved?: (removedItem: UploadedItem, parentFolderUuid: string) => void;
  onStorageFull?: () => void;
}

interface RootFolderUpload {
  taskId: string;
  totalItems: number;
  uploadedItems: number;
  isCancelled: boolean;
  isUploadTracked: boolean;
  createdFolder?: DriveFolderData;
}

const countItemsIn = (folder: IRoot): number =>
  folder.childrenFolders.reduce((count, child) => count + countItemsIn(child), 1 + folder.childrenFiles.length);

const getTopLevelItem = (item: UploadItem): UploadItem => {
  let topLevelItem = item;
  while (topLevelItem.parent) topLevelItem = topLevelItem.parent;
  return topLevelItem;
};

const getParentFolderUuid = (item: UploadItem): string =>
  item.kind === UploadItemKind.File ? item.file.parentFolderId : item.parentFolderUuid;

const createItemsToUpload = ({ roots, files, destinationFolderUuid }: UploadProps): UploadItem[] => [
  ...roots.map((root) => createFolderItem(root, destinationFolderUuid)),
  ...files.map((file) => createFileItem(file, destinationFolderUuid)),
];

const isTaskStopped = (taskId: string): boolean => {
  const status = tasksService.findTask(taskId)?.status;
  return status === TaskStatus.Cancelled || status === TaskStatus.Paused;
};

export class Upload {
  private readonly props: UploadProps;
  private readonly manager: UploadManager;
  private readonly items: UploadItem[];
  private readonly taskIdByItem = new Map<UploadItem, string>();
  private readonly rootFolders = new Map<UploadItem, RootFolderUpload>();
  private readonly failedItems = new Map<UploadItem, FailedUploadItem>();

  constructor(props: UploadProps) {
    this.props = props;
    this.items = createItemsToUpload(props);
    this.manager = new UploadManager({
      ownerUserAuthenticationData: props.ownerUserAuthenticationData,
      uploadRepository: props.uploadRepository,
      getPauseKey: (item) => this.getTaskIdOf(getTopLevelItem(item)) as string,
      events: this.createManagerEvents(),
    });

    for (const item of this.items) {
      if (item.kind === UploadItemKind.Folder) this.trackRootFolder(item);
      else this.trackFile(item);
    }
  }

  async run(): Promise<UploadResult> {
    const result = await this.manager.run(this.items);
    this.rootFolders.forEach((rootFolder, item) => this.finishRootFolder(item as UploadFolderItem, rootFolder));
    return result;
  }

  private createManagerEvents(): UploadManagerEvents {
    return {
      onItemStarted: (item) => this.onItemStarted(item),
      onItemProgress: (item, progress) => this.onItemProgress(item, progress),
      onItemSucceeded: (item, uploadedItem) => this.onItemSucceeded(item, uploadedItem),
      onItemFailed: (item, failure) => this.onItemFailed(item, failure),
      onItemCancelled: (item) => this.onItemCancelled(item),
      onStorageFull: () => this.props.onStorageFull?.(),
    };
  }

  private getTaskIdOf(item: UploadItem): string | undefined {
    return this.taskIdByItem.get(item);
  }

  private trackRootFolder(item: UploadFolderItem): void {
    const taskId = tasksService.create<UploadFolderTask>({
      action: TaskType.UploadFolder,
      folderName: item.folder.name,
      item: item.folder,
      parentFolderId: item.parentFolderUuid,
      showNotification: true,
      cancellable: true,
      stop: () => Promise.resolve(this.cancelRootFolder(item)),
      retry: (failedItem) => this.retry(item, failedItem),
    });

    this.taskIdByItem.set(item, taskId);
    this.rootFolders.set(item, {
      taskId,
      totalItems: countItemsIn(item.folder),
      uploadedItems: 0,
      isCancelled: false,
      isUploadTracked: false,
    });
  }

  private trackFile(item: UploadFileItem): void {
    const { ownerUserAuthenticationData, destinationFolderUuid } = this.props;

    const taskId = tasksService.create<UploadFileTask>({
      action: TaskType.UploadFile,
      item: { uploadFile: item.file.content, parentFolderId: item.file.parentFolderId },
      fileName: item.file.name,
      fileType: item.file.type,
      isFileNameValidated: true,
      showNotification: true,
      cancellable: true,
      sharedItemAuthenticationData: ownerUserAuthenticationData && {
        ownerUserAuthenticationData,
        isDeepFolder: false,
        currentFolderId: destinationFolderUuid,
      },
      stop: () => Promise.resolve(this.manager.cancelItem(item)),
      retry: (failedItem) => this.retry(item, failedItem),
    });

    this.taskIdByItem.set(item, taskId);
  }

  private onItemStarted(item: UploadItem): void {
    const taskId = this.getTaskIdOf(item);
    if (!taskId) return;

    tasksService.updateTask({ taskId, merge: { status: TaskStatus.InProcess } });

    const isFile = item.kind === UploadItemKind.File;
    if (isFile) this.markUploadAsInProcess(taskId);
  }

  private markUploadAsInProcess(taskId: string): void {
    this.props.uploadRepository
      .setUploadState(taskId, TaskStatus.InProcess)
      .catch((error) => errorService.reportError(error));
  }

  private forgetUploadState(taskId: string): void {
    this.props.uploadRepository.removeUploadState(taskId).catch((error) => errorService.reportError(error));
  }

  private onItemProgress(item: UploadItem, progress: number): void {
    const taskId = this.getTaskIdOf(item);
    if (taskId && !isTaskStopped(taskId)) tasksService.updateTask({ taskId, merge: { progress } });
  }

  private onItemSucceeded(item: UploadItem, uploadedItem: UploadedItem): void {
    const isFile = item.kind === UploadItemKind.File;
    const isFolder = item.kind === UploadItemKind.Folder;

    this.clearFailure(item);
    this.props.onItemUploaded?.(uploadedItem, getParentFolderUuid(item), isFolder);

    if (isFile) {
      referralService.trackFileUpload();
      logNetworkInfoForUpload({ fileName: item.file.name, fileSize: item.file.size });
    }

    const taskId = this.getTaskIdOf(item);
    const isFileWithItsOwnTask = !!taskId && isFile;
    if (isFileWithItsOwnTask) {
      this.finishFileTask(taskId, { fileUUID: uploadedItem.uuid });
      return;
    }

    const topLevelItem = getTopLevelItem(item);
    const rootFolder = this.rootFolders.get(topLevelItem) as RootFolderUpload;

    const isRootFolderItself = item === topLevelItem;
    if (isRootFolderItself) {
      rootFolder.createdFolder = uploadedItem as DriveFolderData;
      if (rootFolder.isCancelled) void this.removeRootFolder(item as UploadFolderItem, rootFolder);
    }

    rootFolder.uploadedItems += 1;
    if (!isTaskStopped(rootFolder.taskId)) {
      tasksService.updateTask({
        taskId: rootFolder.taskId,
        merge: { progress: rootFolder.uploadedItems / rootFolder.totalItems },
      });
    }
  }

  private finishFileTask(taskId: string, itemUUID: { fileUUID: string }): void {
    const isTaskCancelled = tasksService.findTask(taskId)?.status === TaskStatus.Cancelled;
    if (!isTaskCancelled) tasksService.updateTask({ taskId, merge: { status: TaskStatus.Success, itemUUID } });

    this.forgetUploadState(taskId);
  }

  private onItemFailed(item: UploadItem, failure: UploadFailure): void {
    this.recordFailure(item, failure);

    const taskId = this.getTaskIdOf(item);
    if (!taskId) return;

    tasksService.updateTask({ taskId, merge: errorMerge(failure.reason) });
    this.forgetUploadState(taskId);
  }

  private onItemCancelled(item: UploadItem): void {
    const taskId = this.getTaskIdOf(item);
    const isFileWithItsOwnTask = !!taskId && item.kind === UploadItemKind.File;
    if (!isFileWithItsOwnTask) return;

    tasksService.updateTask({ taskId, merge: { status: TaskStatus.Cancelled } });
    this.forgetUploadState(taskId);
  }

  private cancelRootFolder(item: UploadFolderItem): void {
    const rootFolder = this.rootFolders.get(item) as RootFolderUpload;
    rootFolder.isCancelled = true;
    this.manager.cancelItem(item);
    if (rootFolder.createdFolder) void this.removeRootFolder(item, rootFolder);
  }

  private async removeRootFolder(item: UploadFolderItem, { createdFolder }: RootFolderUpload): Promise<void> {
    if (!createdFolder) return;

    try {
      await newStorageService.deleteFolderByUuid(createdFolder.uuid);
      this.props.onItemRemoved?.(createdFolder, item.parentFolderUuid);
    } catch (error) {
      errorService.reportError(error);
    }
  }

  private finishRootFolder(item: UploadFolderItem, rootFolder: RootFolderUpload): void {
    this.forgetUploadState(rootFolder.taskId);

    const { createdFolder } = rootFolder;
    if (rootFolder.isCancelled || !createdFolder) return;

    tasksService.updateTask({
      taskId: rootFolder.taskId,
      merge: { status: TaskStatus.Success, itemUUID: { rootFolderUUID: createdFolder.uuid } },
    });

    const hasEverythingUploaded = this.getFailuresOf(item).length === 0;
    const shouldTrackUpload = hasEverythingUploaded && !rootFolder.isUploadTracked;
    if (shouldTrackUpload) {
      rootFolder.isUploadTracked = true;
      referralService.trackFolderUpload();
      logNetworkInfoForUpload({ folderName: item.folder.name });
    }
  }

  private async retry(topLevelItem: UploadItem, pickedFailedItem?: FailedUploadItem): Promise<void> {
    const failures = this.getFailuresOf(topLevelItem);
    const failuresToRetry = pickedFailedItem
      ? failures.filter(([, failedItem]) => failedItem.id === pickedFailedItem.id)
      : failures;

    const hasNothingToRetry = failuresToRetry.length === 0;
    if (hasNothingToRetry) return;

    for (const [item, failedItem] of failuresToRetry) this.failedItems.set(item, { ...failedItem, isRetrying: true });
    this.syncFailedItemsToTask(topLevelItem);

    const taskId = this.getTaskIdOf(topLevelItem) as string;
    const rootFolder = this.rootFolders.get(topLevelItem);
    const progress = rootFolder ? tasksService.findTask(taskId)?.progress : 0;
    tasksService.updateTask({ taskId, merge: { status: TaskStatus.InProcess, subtitle: undefined, progress } });

    const itemsToRetry = failuresToRetry.map(([item]) => item);
    await this.manager.run(itemsToRetry);

    if (rootFolder) this.finishRootFolder(topLevelItem as UploadFolderItem, rootFolder);
  }

  private getFailuresOf(topLevelItem: UploadItem): [UploadItem, FailedUploadItem][] {
    return [...this.failedItems].filter(([item]) => getTopLevelItem(item) === topLevelItem);
  }

  private recordFailure(item: UploadItem, failure: UploadFailure): void {
    const failureId = this.failedItems.get(item)?.id ?? uniqueId();
    this.failedItems.set(item, toFailedUploadItem(failureId, item, failure));
    this.syncFailedItemsToTask(getTopLevelItem(item));
  }

  private clearFailure(item: UploadItem): void {
    const hadFailed = this.failedItems.delete(item);
    if (hadFailed) this.syncFailedItemsToTask(getTopLevelItem(item));
  }

  private syncFailedItemsToTask(topLevelItem: UploadItem): void {
    const failedItems = this.getFailuresOf(topLevelItem).map(([, failedItem]) => failedItem);
    tasksService.updateTask({ taskId: this.getTaskIdOf(topLevelItem) as string, merge: { failedItems } });
  }
}
