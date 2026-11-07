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
import { UploadManager } from './UploadManager';
import {
  countItemsIn,
  createFileItem,
  createFolderItem,
  getParentFolderUuid,
  getTopLevelItem,
  isFolderItem,
} from './uploadItemTree';
import { PersistUploadRepository } from 'app/repositories/DatabaseUploadRepository';
import { IRoot } from 'app/store/slices/storage/types';
import tasksService from 'app/tasks/services/tasks.service';
import { TaskStatus, TaskType, UploadFileTask, UploadFolderTask } from 'app/tasks/types';
import { errorMerge, folderRemovalFailedMerge } from 'app/tasks/upload/uploadTaskErrors';
import errorService from 'services/error.service';
import referralService from 'services/referral.service';

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
  hasFailedItems: boolean;
  createdFolder?: DriveFolderData;
}

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
  private readonly cancelledRootFolderDeletions: Promise<void>[] = [];

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
    await Promise.all(this.cancelledRootFolderDeletions);
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
    });

    this.taskIdByItem.set(item, taskId);
    this.rootFolders.set(item, {
      taskId,
      totalItems: countItemsIn(item.folder),
      uploadedItems: 0,
      isCancelled: false,
      hasFailedItems: false,
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
    const taskId = this.getTaskIdOf(item);
    const isFileWithItsOwnTask = !!taskId && !isFolderItem(item);
    if (isFileWithItsOwnTask) this.finishFileTask(taskId, { fileUUID: uploadedItem.uuid });
    else this.countUploadedInRootFolder(item, uploadedItem);

    const isFile = item.kind === UploadItemKind.File;
    this.props.onItemUploaded?.(uploadedItem, getParentFolderUuid(item), !isFile);

    if (isFile) {
      referralService.trackFileUpload();
      logNetworkInfoForUpload({ fileName: item.file.name, fileSize: item.file.size });
    }
  }

  private countUploadedInRootFolder(item: UploadItem, uploadedItem: UploadedItem): void {
    const topLevelItem = getTopLevelItem(item);
    const rootFolder = this.rootFolders.get(topLevelItem) as RootFolderUpload;

    const isRootFolderItself = item === topLevelItem;
    if (isRootFolderItself) {
      rootFolder.createdFolder = uploadedItem as DriveFolderData;
      if (rootFolder.isCancelled) {
        this.cancelledRootFolderDeletions.push(this.deleteCancelledRootFolder(item as UploadFolderItem, rootFolder));
      }
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
    const rootFolder = this.rootFolders.get(getTopLevelItem(item));
    if (rootFolder) rootFolder.hasFailedItems = true;

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
    if (rootFolder.createdFolder) {
      this.cancelledRootFolderDeletions.push(this.deleteCancelledRootFolder(item, rootFolder));
    }
  }

  private async deleteCancelledRootFolder(
    item: UploadFolderItem,
    { taskId, createdFolder }: RootFolderUpload,
  ): Promise<void> {
    if (!createdFolder) return;

    try {
      await newStorageService.deleteFolderByUuid(createdFolder.uuid);
      this.props.onItemRemoved?.(createdFolder, item.parentFolderUuid);
    } catch (error) {
      errorService.reportError(error);
      tasksService.updateTask({ taskId, merge: folderRemovalFailedMerge() });
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

    const hasEverythingUploaded = !rootFolder.hasFailedItems;
    if (hasEverythingUploaded) {
      referralService.trackFolderUpload();
      logNetworkInfoForUpload({ folderName: item.folder.name });
    }
  }
}
