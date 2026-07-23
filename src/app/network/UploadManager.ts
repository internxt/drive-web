import { queue, QueueObject } from 'async';
import { randomBytes } from 'node:crypto';
import errorService from 'services/error.service';
import { HTTP_CODE_ERRORS, HTTP_STATUS_CODES } from '../core/constants';
import uploadFile from 'app/drive/services/file.service/uploadFile';
import { DriveFileData } from 'app/drive/types';
import { PersistUploadRepository } from '../repositories/DatabaseUploadRepository';
import { TaskStatus } from '../tasks/types';
import { ConnectionLostError } from './requests';
import { FileToUpload } from 'app/drive/services/file.service/types';
import RetryManager, { RetryableTask } from './RetryManager';
import { ErrorMessages } from 'app/core/constants';
import { MAX_UPLOAD_ATTEMPTS, TWENTY_MEGABYTES, USE_MULTIPART_THRESHOLD_BYTES } from './networkConstants';
import { OwnerUserAuthenticationData, UploadErrorReason } from './types';

enum FileSizeType {
  Big = 'big',
  Medium = 'medium',
  Small = 'small',
}

type Options = {
  isRetriedUpload?: boolean;
  showNotifications?: boolean;
  showErrors?: boolean;
  ownerUserAuthenticationData?: OwnerUserAuthenticationData;
  sharedItemData?: {
    isDeepFolder?: boolean;
    currentFolderId?: string;
  };
  isUploadedFromFolder?: boolean;
};

export type UploadManagerFileParams = {
  filecontent: FileToUpload;
  taskId?: string;
  relatedTaskId?: string;
  fileType?: string;
  userEmail: string;
  parentFolderId: string;
  onFinishUploadFile?: (driveItemData: DriveFileData, taskId: string) => void;
  abortController?: AbortController;
  isUploadedFromFolder?: boolean;
};

export type UploadFileParamsWithTaskId = UploadManagerFileParams & { taskId: string };

/**
 * Upload progress notifications emitted by the manager. The manager knows nothing
 * about how uploads are presented to the user; observers subscribe to these events.
 */
export interface UploadManagerEvents {
  onUploadStart?: (file: UploadFileParamsWithTaskId, stopUpload: () => Promise<void>) => void;
  onUploadAttempt?: (file: UploadFileParamsWithTaskId) => void;
  onUploadProgress?: (file: UploadFileParamsWithTaskId, progress: number) => void;
  onUploadSuccess?: (file: UploadFileParamsWithTaskId, driveFileData: DriveFileData) => void | Promise<void>;
  onUploadError?: (file: UploadFileParamsWithTaskId, reason?: UploadErrorReason) => void;
  onUploadAborted?: (file: UploadFileParamsWithTaskId) => void;
  registerUploadAbort?: (file: UploadFileParamsWithTaskId, abort: () => void) => (() => void) | void;
}

interface UploadFileWithManagerProps {
  files: UploadFileParamsWithTaskId[];
  maxSpaceOccupiedCallback: () => void;
  uploadRepository: PersistUploadRepository;
  abortController?: AbortController;
  options?: Options;
  onFileUploadCallback?: (driveFileData: DriveFileData) => void;
  fileSizeExceededCallback?: () => void;
  events?: UploadManagerEvents;
}

export const uploadFileWithManager = (props: UploadFileWithManagerProps): Promise<{ uploadedFiles: DriveFileData[] }> =>
  new UploadManager(props).run();

class UploadManager {
  private currentGroupBeingUploaded: FileSizeType = FileSizeType.Small;
  private errored = false;
  private uploadsProgress: Record<string, number> = {};
  private readonly abortController?: AbortController;
  private readonly items: UploadFileParamsWithTaskId[];
  private readonly options?: Options;
  private readonly maxSpaceOccupiedCallback: () => void;
  private readonly fileSizeExceededCallback?: () => void;
  private readonly onFileUploadCallback?: (driveFileData: DriveFileData) => void;
  private readonly uploadRepository?: PersistUploadRepository;
  private readonly events?: UploadManagerEvents;
  private readonly filesUploadedList: (DriveFileData & { taskId: string })[] = [];
  private readonly filesGroups: Record<
    FileSizeType,
    {
      upperBound: number;
      lowerBound: number;
      concurrency: number;
    }
  > = {
    [FileSizeType.Big]: {
      upperBound: Infinity,
      lowerBound: USE_MULTIPART_THRESHOLD_BYTES,
      concurrency: 1,
    },
    [FileSizeType.Medium]: {
      upperBound: USE_MULTIPART_THRESHOLD_BYTES - 1,
      lowerBound: TWENTY_MEGABYTES,
      concurrency: 6,
    },
    [FileSizeType.Small]: {
      upperBound: TWENTY_MEGABYTES - 1,
      lowerBound: 0,
      concurrency: 6,
    },
  };

  private readonly uploadQueue: QueueObject<UploadFileParamsWithTaskId> = queue<UploadFileParamsWithTaskId>(
    (fileData, next: (err: Error | null, res?: DriveFileData) => void) => {
      if (this.abortController?.signal.aborted ?? fileData.abortController?.signal.aborted) return;

      this.manageMemoryUsage();

      let uploadAttempts = 0;
      const uploadId = randomBytes(10).toString('hex');
      const taskId = fileData.taskId;
      this.uploadsProgress[uploadId] = 0;

      const file = fileData.filecontent;

      this.events?.onUploadStart?.(fileData, async () => {
        if (this.abortController) this.abortController?.abort();
        else fileData?.abortController?.abort();
      });

      const existsRelatedTask = !!fileData.relatedTaskId;
      if (!existsRelatedTask) this.uploadRepository?.setUploadState(taskId, TaskStatus.InProcess);
      const retryUploadType = fileData.fileType;

      const upload = async () => {
        uploadAttempts++;

        this.events?.onUploadAttempt?.(fileData);

        const uploadStatus = this.uploadRepository?.getUploadState(fileData.relatedTaskId ?? taskId);
        const isPaused = (await uploadStatus) === TaskStatus.Paused;
        const continueUploadOptions = {
          taskId: fileData.relatedTaskId ?? taskId,
          isPaused,
          isRetriedUpload: !!this.options?.isRetriedUpload,
        };

        let unsubscribeAbortListener: (() => void) | void;

        uploadFile(
          {
            name: file.name,
            size: file.size,
            type: retryUploadType ?? file.type,
            content: file.content,
            parentFolderId: file.parentFolderId,
          },
          (uploadProgress) => {
            this.uploadsProgress[uploadId] = uploadProgress;
            this.events?.onUploadProgress?.(fileData, uploadProgress);
          },
          {
            isTeam: !!this.options?.ownerUserAuthenticationData?.workspaceId,
            abortController: this.abortController ?? fileData.abortController,
            ownerUserAuthenticationData: this.options?.ownerUserAuthenticationData,
            abortCallback: (abort?: () => void) => {
              unsubscribeAbortListener = this.events?.registerUploadAbort?.(fileData, () => abort?.());
            },
            isUploadedFromFolder: fileData.isUploadedFromFolder,
          },
          continueUploadOptions,
        )
          .then(async (driveFileData) => {
            const isUploadAborted = this.abortController?.signal.aborted ?? fileData.abortController?.signal.aborted;

            if (isUploadAborted) {
              throw new Error('Upload task cancelled');
            }

            const driveFileDataWithNameParsed = { ...driveFileData, name: file.name };
            this.filesUploadedList.push({ ...driveFileDataWithNameParsed, taskId });

            await this.events?.onUploadSuccess?.(fileData, driveFileDataWithNameParsed);

            fileData.onFinishUploadFile?.(driveFileDataWithNameParsed, taskId);

            if (this.onFileUploadCallback) {
              this.onFileUploadCallback(driveFileDataWithNameParsed);
            }
            next(null, driveFileDataWithNameParsed);
          })
          .catch((error) => {
            const isUploadAborted =
              !!this.abortController?.signal.aborted || !!fileData.abortController?.signal.aborted || error === 'abort';
            const isLostConnectionError =
              error instanceof ConnectionLostError || error.message === ErrorMessages.NetworkError;

            if (uploadAttempts < MAX_UPLOAD_ATTEMPTS && !isUploadAborted && !isLostConnectionError) {
              upload();
            } else {
              this.handleUploadErrors({
                error,
                fileData,
                isUploadAborted,
                isLostConnectionError,
                next,
              });
            }
          })
          .finally(() => {
            unsubscribeAbortListener?.();
          });
      };

      upload();
    },
    this.filesGroups.small.concurrency,
  );

  constructor(props: UploadFileWithManagerProps) {
    this.items = props.files;
    this.abortController = props.abortController;
    this.options = props.options;
    this.maxSpaceOccupiedCallback = props.maxSpaceOccupiedCallback;
    this.fileSizeExceededCallback = props.fileSizeExceededCallback;
    this.uploadRepository = props.uploadRepository;
    this.onFileUploadCallback = props.onFileUploadCallback;
    this.events = props.events;
  }

  private handleUploadErrors({
    error,
    fileData,
    isUploadAborted,
    isLostConnectionError,
    next,
  }: {
    error: unknown;
    fileData: UploadFileParamsWithTaskId;
    isUploadAborted: boolean;
    isLostConnectionError: boolean;
    next: (err: Error | null, res?: DriveFileData) => void;
  }) {
    const castedError = errorService.castError(error);
    // Handle retry error
    if (castedError.message === 'Retryable file') {
      next(null);
      return;
    }

    // Handle lost connection error
    if (isLostConnectionError) {
      errorService.reportError(castedError);
      this.events?.onUploadError?.(fileData, 'connection-lost');
      this.errored = true;
      next(castedError);
      return;
    }

    // Handle unexpected errors
    if (!isUploadAborted) {
      this.events?.onUploadError?.(fileData, 'upload-failed');
      errorService.reportError(castedError);

      // Handle file size exceeded
      if (castedError.code === HTTP_CODE_ERRORS.FILE_UPLOAD_SIZE_EXCEEDED) {
        this.fileSizeExceededCallback?.();
      }

      // Handle max space used error
      if ((error as { status?: number })?.status === HTTP_STATUS_CODES.MAX_SPACE_USED) {
        this.maxSpaceOccupiedCallback();
      }

      // Ensure upload queue is killed and errored is set
      if (!this.errored) {
        this.uploadQueue.kill();
      }
      this.errored = true;
    }

    // Handle upload aborted
    if (isUploadAborted) {
      this.events?.onUploadAborted?.(fileData);
      next(null);
      return;
    }

    // If relatedTaskId is present, kill upload queue
    if (fileData.relatedTaskId) {
      this.uploadQueue.kill();
    }

    next(castedError);
  }

  private getMemoryUsagePercentage(): number | null {
    if (!window?.performance?.memory) {
      return null;
    }

    const memory = window.performance.memory;
    if (!memory?.jsHeapSizeLimit || !memory?.usedJSHeapSize) {
      return null;
    }

    return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
  }

  private handleConcurrencyIncrease(memoryUsagePercentage: number): void {
    const shouldIncrease = memoryUsagePercentage < 0.7 && this.currentGroupBeingUploaded !== FileSizeType.Big;

    if (!shouldIncrease) return;

    const newConcurrency = Math.min(this.uploadQueue.concurrency + 1, this.filesGroups[FileSizeType.Small].concurrency);

    if (newConcurrency !== this.uploadQueue.concurrency) {
      console.warn(`Memory usage under 70%. Increasing upload concurrency to ${newConcurrency}`);
      this.uploadQueue.concurrency = newConcurrency;
    }
  }

  private handleConcurrencyReduction(memoryUsagePercentage: number): void {
    const shouldReduce = memoryUsagePercentage >= 0.8 && this.uploadQueue.concurrency > 1;

    if (shouldReduce) {
      console.warn('Memory usage reached 80%. Reducing upload concurrency.');
      this.uploadQueue.concurrency = 1;
    }
  }

  private manageMemoryUsage() {
    const memoryUsagePercentage = this.getMemoryUsagePercentage();
    console.log('Current memory usage percentage:', memoryUsagePercentage);

    if (memoryUsagePercentage === null) {
      console.warn('Memory usage control is not available');
      return;
    }

    this.handleConcurrencyIncrease(memoryUsagePercentage);
    this.handleConcurrencyReduction(memoryUsagePercentage);
  }

  private classifyFilesBySize(
    files: UploadFileParamsWithTaskId[],
  ): [UploadFileParamsWithTaskId[], UploadFileParamsWithTaskId[], UploadFileParamsWithTaskId[]] {
    return [
      files.filter((f) => f.filecontent.size >= this.filesGroups.big.lowerBound),
      files.filter(
        (f) =>
          f.filecontent.size >= this.filesGroups.medium.lowerBound &&
          f.filecontent.size <= this.filesGroups.medium.upperBound,
      ),
      files.filter(
        (f) =>
          f.filecontent.size >= this.filesGroups.small.lowerBound &&
          f.filecontent.size <= this.filesGroups.small.upperBound,
      ),
    ];
  }

  private handleFailedUploads(files: UploadFileParamsWithTaskId[]): void {
    const filesUploadedTaskId = new Set(this.filesUploadedList.map((fileUploaded) => fileUploaded.taskId));
    const failedUploadFiles = files.filter((file) => !filesUploadedTaskId.has(file.taskId));

    failedUploadFiles.forEach((fileErrored) => {
      this.events?.onUploadError?.(fileErrored);
      this.uploadRepository?.removeUploadState(fileErrored.taskId);
    });
  }

  async run(): Promise<{ uploadedFiles: DriveFileData[] }> {
    try {
      this.items.forEach((item) => (item.isUploadedFromFolder = this.options?.isUploadedFromFolder));

      const [bigSizedFiles, mediumSizedFiles, smallSizedFiles] = this.classifyFilesBySize(this.items);
      const uploadedFilesData: DriveFileData[] = [];

      const uploadFiles = async (files: UploadFileParamsWithTaskId[], concurrency: number) => {
        if (this.abortController?.signal.aborted) return [];

        this.uploadQueue.concurrency = concurrency;

        const uploadPromises: Promise<DriveFileData>[] = await this.uploadQueue.pushAsync(files);

        let uploadedFiles: DriveFileData[] = [];
        const filesToRetry: RetryableTask[] = [];

        uploadedFiles = await Promise.all(uploadPromises);

        for (let i = 0; i < uploadedFiles.length; i++) {
          const uploadedFile = uploadedFiles[i];
          if (uploadedFile) uploadedFilesData.push(uploadedFile);
          else
            filesToRetry.push({
              taskId: files[i]?.taskId ?? files[i]?.relatedTaskId ?? '',
              type: 'upload',
              params: files[i],
            });
        }

        if (filesToRetry.length > 0) RetryManager.addTasks(filesToRetry);
        const fileTaskId = files[0]?.taskId;
        if (files.length === 1 && fileTaskId) {
          const noFilesToRetry = filesToRetry.length === 0;
          if (noFilesToRetry) RetryManager.removeTask(fileTaskId);
          else RetryManager.changeStatus(fileTaskId, 'failed');
        }
      };

      if (smallSizedFiles.length > 0) await uploadFiles(smallSizedFiles, this.filesGroups.small.concurrency);

      this.currentGroupBeingUploaded = FileSizeType.Medium;

      if (mediumSizedFiles.length > 0) await uploadFiles(mediumSizedFiles, this.filesGroups.medium.concurrency);

      this.currentGroupBeingUploaded = FileSizeType.Big;

      if (bigSizedFiles.length > 0) await uploadFiles(bigSizedFiles, this.filesGroups.big.concurrency);

      return { uploadedFiles: uploadedFilesData };
    } catch (error) {
      this.handleFailedUploads(this.items);

      errorService.reportError(error);
      throw error;
    }
  }
}
