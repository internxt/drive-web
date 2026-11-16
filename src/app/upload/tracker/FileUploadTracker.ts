import tasksService from 'app/tasks/services/tasks.service';
import { TaskStatus, TaskType, UploadFileTask } from 'app/tasks/types';
import errorService from 'services/error.service';
import { UploadedItem, UploadFileItem, UploadItem } from '../types';
import { UploadTracker, UploadTrackerProps } from './UploadTracker';

export class FileUploadTracker extends UploadTracker<UploadFileItem> {
  private uploadedFileUuid?: string;

  constructor(item: UploadFileItem, props: UploadTrackerProps) {
    const taskId = tasksService.create<UploadFileTask>({
      action: TaskType.UploadFile,
      item: { uploadFile: item.file.content, parentFolderId: item.file.parentFolderId },
      fileName: item.file.name,
      fileType: item.file.type,
      isFileNameValidated: true,
      showNotification: true,
      cancellable: true,
      stop: () => Promise.resolve(props.stop()),
      retry: () => props.retry(),
    });
    super(item, props, taskId);
  }

  onStarted(item: UploadItem): void {
    super.onStarted(item);
    if (item !== this.item) return;

    this.props.uploadRepository
      .setUploadState(this.taskId, TaskStatus.InProcess)
      .catch((error) => errorService.reportError(error));
  }

  protected uploadSucceeded(_item: UploadItem, uploadedItem: UploadedItem): void {
    this.uploadedFileUuid = uploadedItem.uuid;
  }

  /**
   * A retried file is uploaded again from its first byte.
   */
  protected getRetryProgress(): number {
    return 0;
  }

  /**
   * A file that finished uploading right after being cancelled is in its folder, so its task succeeds.
   */
  protected finishUpload(): void {
    if (!this.uploadedFileUuid) return;

    this.updateTask({ status: TaskStatus.Success, itemUUID: { fileUUID: this.uploadedFileUuid } });
  }
}
