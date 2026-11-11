import tasksService from 'app/tasks/services/tasks.service';
import { TaskStatus, TaskType, UploadFileTask } from 'app/tasks/types';
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
      pause: () => Promise.resolve(props.pause()),
      resume: () => Promise.resolve(props.resume()),
    });
    super(item, props, taskId);
  }

  onStarted(item: UploadItem): void {
    super.onStarted(item);
    if (item === this.item) this.saveUploadState(TaskStatus.InProcess);
  }

  protected uploadSucceeded(_item: UploadItem, uploadedItem: UploadedItem): void {
    this.uploadedFileUuid = uploadedItem.uuid;
  }

  protected getUploadedProgress(): number {
    return this.uploadedFileUuid ? 1 : 0;
  }

  /**
   * A file that finished uploading right after being cancelled is in its folder, so its task succeeds.
   */
  protected finishUpload(): void {
    if (!this.uploadedFileUuid) return;

    this.updateTask({ status: TaskStatus.Success, itemUUID: { fileUUID: this.uploadedFileUuid } });
  }
}
