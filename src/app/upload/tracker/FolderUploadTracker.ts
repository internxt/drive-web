import newStorageService from 'app/drive/services/new-storage.service';
import { DriveFolderData } from 'app/drive/types';
import { logNetworkInfoForUpload } from 'app/network/networkInformation';
import tasksService from 'app/tasks/services/tasks.service';
import { TaskStatus, TaskType, UploadFolderTask } from 'app/tasks/types';
import { folderRemovalFailedMerge } from 'app/tasks/upload/uploadTaskErrors';
import errorService from 'services/error.service';
import referralService from 'services/referral.service';
import { UploadedItem, UploadFolderItem, UploadItem } from '../types';
import { countItemsIn } from '../uploadItemTree';
import { UploadTracker, UploadTrackerProps } from './UploadTracker';

export class FolderUploadTracker extends UploadTracker<UploadFolderItem> {
  private readonly totalItems: number;
  private uploadedItems = 0;
  private createdFolder?: DriveFolderData;
  private removal?: Promise<void>;

  constructor(item: UploadFolderItem, props: UploadTrackerProps) {
    const taskId = tasksService.create<UploadFolderTask>({
      action: TaskType.UploadFolder,
      folderName: item.folder.name,
      item: item.folder,
      parentFolderId: item.parentFolderUuid,
      showNotification: true,
      cancellable: true,
      stop: () => Promise.resolve(props.stop()),
      retry: () => props.retry(),
    });
    super(item, props, taskId);
    this.totalItems = countItemsIn(item.folder);
  }

  protected uploadSucceeded(item: UploadItem, uploadedItem: UploadedItem): void {
    if (item === this.item) {
      this.createdFolder = uploadedItem as DriveFolderData;
      if (this.isCancelled) this.removeCreatedFolder();
    }

    this.uploadedItems++;
    if (!this.isStopped()) this.updateTask({ progress: this.getUploadedRatio() });
  }

  /**
   * A retried folder keeps what was already uploaded in it.
   */
  protected getRetryProgress(): number {
    return this.getUploadedRatio();
  }

  protected async finishUpload(): Promise<void> {
    await this.removal;
    if (this.isCancelled || !this.createdFolder) return;

    this.updateTask({ status: TaskStatus.Success, itemUUID: { rootFolderUUID: this.createdFolder.uuid } });
    if (this.failures.isEmpty()) {
      this.track(() => {
        referralService.trackFolderUpload();
        logNetworkInfoForUpload({ folderName: this.item.folder.name });
      });
    }
  }

  cancel(): void {
    super.cancel();
    this.removeCreatedFolder();
  }

  private getUploadedRatio(): number {
    return this.uploadedItems / this.totalItems;
  }

  private removeCreatedFolder(): void {
    if (!this.createdFolder || this.removal) return;

    this.removal = this.removeFolder(this.createdFolder).catch((error) => {
      errorService.reportError(error);
      this.updateTask(folderRemovalFailedMerge());
    });
  }

  private async removeFolder(folder: DriveFolderData): Promise<void> {
    await newStorageService.deleteFolderByUuid(folder.uuid);
    this.props.onItemRemoved?.(folder, this.item.parentFolderUuid);
  }
}
