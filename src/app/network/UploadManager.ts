import { queue, QueueObject } from 'async';
import { randomBytes } from 'crypto';
import { t } from 'i18next';
import errorService from '../core/services/error.service';
import { HTTP_CODES } from '../core/services/http.service';
import uploadFile from '../drive/services/file.service/uploadFile';
import { DriveFileData } from '../drive/types';
import { PersistUploadRepository } from '../repositories/DatabaseUploadRepository';
import tasksService from '../tasks/services/tasks.service';
import { TaskData, TaskEvent, TaskStatus, TaskType, UploadFileTask } from '../tasks/types';
import { ConnectionLostError } from './requests';
import { FileToUpload } from '../drive/services/file.service/types';

const TWENTY_MEGABYTES = 20 * 1024 * 1024;
const USE_MULTIPART_THRESHOLD_BYTES = 50 * 1024 * 1024;

const MAX_UPLOAD_ATTEMPTS = 2;

enum FileSizeType {
  Big = 'big',
  Medium = 'medium',
  Small = 'small',
}

export interface OwnerUserAuthenticationData {
  token: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey: string;
  bucketId: string;
  // to manage B2B workspaces
  workspaceId?: string;
  workspacesToken?: string;
  resourcesToken: string;
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
};

type UploadManagerFileParams = {
  filecontent: FileToUpload;
  taskId?: string;
  relatedTaskId?: string;
  fileType?: string;
  userEmail: string;
  parentFolderId: string;
  onFinishUploadFile?: (driveItemData: DriveFileData, taskId: string) => void;
  abortController?: AbortController;
};

export const uploadFileWithManager = (
  files: UploadManagerFileParams[],
  maxSpaceOccupiedCallback: () => void,
  uploadRepository: PersistUploadRepository,
  abortController?: AbortController,
  options?: Options,
  relatedTaskProgress?: { filesUploaded: number; totalFilesToUpload: number },
  onFileUploadCallback?: (driveFileData: DriveFileData) => void,
): Promise<DriveFileData[]> => {
  const uploadManager = new UploadManager(
    files,
    maxSpaceOccupiedCallback,
    uploadRepository,
    abortController,
    options,
    relatedTaskProgress,
    onFileUploadCallback,
  );
  return uploadManager.run();
};

class UploadManager {
  private currentGroupBeingUploaded: FileSizeType = FileSizeType.Small;
  private errored = false;
  private uploadsProgress: Record<string, number> = {};
  private abortController?: AbortController;
  private items: UploadManagerFileParams[];
  private options?: Options;
  private relatedTaskProgress?: { filesUploaded: number; totalFilesToUpload: number };
  private maxSpaceOccupiedCallback: () => void;
  private onFileUploadCallback?: (driveFileData: DriveFileData) => void;
  private uploadRepository?: PersistUploadRepository;
  private filesUploadedList: (DriveFileData & { taskId: string })[] = [];
  private filesGroups: Record<
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
      lowerBound: 1,
      concurrency: 6,
    },
  };

  private uploadQueue: QueueObject<UploadManagerFileParams> = queue<UploadManagerFileParams & { taskId: string }>(
    (fileData, next: (err: Error | null, res?: DriveFileData) => void) => {
      if (this.abortController?.signal.aborted ?? fileData.abortController?.signal.aborted) return;

      this.manageMemoryUsage();

      let uploadAttempts = 0;
      const uploadId = randomBytes(10).toString('hex');
      const taskId = fileData.taskId;
      this.uploadsProgress[uploadId] = 0;

      const file = fileData.filecontent;
      const task = tasksService.findTask(taskId);

      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.Encrypting,
          stop: async () => {
            if (this.abortController) this.abortController?.abort();
            else fileData?.abortController?.abort();
          },
        },
      });

      const existsRelatedTask = !!fileData.relatedTaskId;
      if (!existsRelatedTask) this.uploadRepository?.setUploadState(taskId, TaskStatus.InProcess);
      const retryUploadType = fileData.fileType;

      const upload = async () => {
        uploadAttempts++;

        if (!existsRelatedTask)
          tasksService.updateTask({
            taskId: taskId,
            merge: {
              status: TaskStatus.InProcess,
            },
          });

        const uploadStatus = this.uploadRepository?.getUploadState(fileData.relatedTaskId ?? taskId);
        const isPaused = (await uploadStatus) === TaskStatus.Paused;
        const continueUploadOptions = {
          taskId: fileData.relatedTaskId ?? taskId,
          isPaused,
          isRetriedUpload: !!this.options?.isRetriedUpload,
        };

        let abortListener: (task: TaskData) => void;

        uploadFile(
          fileData.userEmail,
          {
            name: file.name,
            size: file.size,
            type: retryUploadType ?? file.type,
            content: file.content,
            parentFolderId: file.parentFolderId,
          },
          (uploadProgress) => {
            this.uploadsProgress[uploadId] = uploadProgress;
            const isTaskPaused = task?.status === TaskStatus.Paused;
            const isTaskCancelled = task?.status === TaskStatus.Cancelled;

            if (!isTaskCancelled && !isTaskPaused) {
              tasksService.updateTask({
                taskId: taskId,
                merge: {
                  progress: uploadProgress,
                },
              });
            }
          },
          {
            isTeam: false,
            abortController: this.abortController ?? fileData.abortController,
            ownerUserAuthenticationData: this.options?.ownerUserAuthenticationData,
            abortCallback: (abort?: () => void) => {
              abortListener = (task) => {
                if (task.id === taskId) {
                  abort?.();
                }
              };
              tasksService.addListener({
                event: TaskEvent.TaskCancelled,
                listener: abortListener,
              });
            },
          },
          continueUploadOptions,
        )
          .then(async (driveFileData) => {
            const isUploadAborted = this.abortController?.signal.aborted ?? fileData.abortController?.signal.aborted;

            if (isUploadAborted) {
              throw Error('Upload task cancelled');
            }

            const driveFileDataWithNameParsed = { ...driveFileData, name: file.name };
            this.filesUploadedList.push({ ...driveFileDataWithNameParsed, taskId });

            if (this.relatedTaskProgress && fileData.relatedTaskId) {
              this.relatedTaskProgress.filesUploaded += 1;

              const uploadStatus = this.uploadRepository?.getUploadState(fileData.relatedTaskId);
              const isPaused = (await uploadStatus) === TaskStatus.Paused;

              if (!isPaused)
                tasksService.updateTask({
                  taskId: fileData.relatedTaskId,
                  merge: {
                    progress: this.relatedTaskProgress.filesUploaded / this.relatedTaskProgress.totalFilesToUpload,
                  },
                });
            }

            tasksService.updateTask({
              taskId: taskId,
              merge: { status: TaskStatus.Success, itemUUID: { fileUUID: driveFileData.uuid } },
            });

            fileData.onFinishUploadFile?.(driveFileDataWithNameParsed, taskId);

            errorService.addBreadcrumb({
              level: 'info',
              category: 'file',
              message: 'File upload completed',
              data: {
                name: file.name,
                size: file.size,
                type: fileData.fileType ?? file.type,
                parentFolderId: file.parentFolderId,
                uploadProgress: this.uploadsProgress[uploadId] ?? 0,
              },
            });

            if (this.onFileUploadCallback) {
              this.onFileUploadCallback(driveFileDataWithNameParsed);
            }
            next(null, driveFileDataWithNameParsed);
          })
          .catch((error) => {
            const isUploadAborted =
              !!this.abortController?.signal.aborted || !!fileData.abortController?.signal.aborted || error === 'abort';
            const isLostConnectionError = error instanceof ConnectionLostError || error.message === 'Network Error';

            if (uploadAttempts < MAX_UPLOAD_ATTEMPTS && !isUploadAborted && !isLostConnectionError) {
              upload();
            } else {
              this.handleUploadErrors({
                error,
                fileData,
                taskId,
                isUploadAborted,
                isLostConnectionError,
                next,
                task,
                uploadId,
              });
            }
          })
          .finally(() => {
            tasksService.removeListener({
              event: TaskEvent.TaskCancelled,
              listener: abortListener,
            });
          });
      };

      upload();
    },
    this.filesGroups.small.concurrency,
  );

  constructor(
    items: UploadManagerFileParams[],
    maxSpaceOccupiedCallback: () => void,
    uploadRepository?: PersistUploadRepository,
    abortController?: AbortController,
    options?: Options,
    relatedTaskProgress?: { filesUploaded: number; totalFilesToUpload: number },
    onFileUploadCallback?: (driveFileData: DriveFileData) => void,
  ) {
    this.items = items;
    this.abortController = abortController;
    this.options = options;
    this.relatedTaskProgress = relatedTaskProgress;
    this.maxSpaceOccupiedCallback = maxSpaceOccupiedCallback;
    this.uploadRepository = uploadRepository;
    this.onFileUploadCallback = onFileUploadCallback;
  }

  private handleUploadErrors({
    error,
    fileData,
    taskId,
    isUploadAborted,
    isLostConnectionError,
    next,
    task,
    uploadId,
  }: {
    error: any;
    fileData: UploadManagerFileParams & { taskId: string };
    taskId: string;
    isUploadAborted: boolean;
    isLostConnectionError: boolean;
    next: (err: Error | null, res?: DriveFileData) => void;
    task: TaskData | undefined;
    uploadId: string;
  }) {
    const file = fileData.filecontent;

    const fileInfoToReport = {
      name: file.name,
      size: file.size,
      type: fileData.fileType ?? file.type,
      parentFolderId: file.parentFolderId,
      uploadProgress: this.uploadsProgress[uploadId] ?? 0,
      filesUploaded: this.relatedTaskProgress
        ? this.relatedTaskProgress.filesUploaded / this.relatedTaskProgress.totalFilesToUpload
        : 'unknown',
      context: error?.context,
      errStatus: error?.status,
    };

    // Handle lost connection error
    if (isLostConnectionError) {
      errorService.reportError(error, { extra: fileInfoToReport });
      tasksService.updateTask({
        taskId,
        merge: { status: TaskStatus.Error, subtitle: t('error.connectionLostError') ?? undefined },
      });
      this.errored = true;
      next(error);
      return;
    }

    const isUnexpectedError = task?.status !== TaskStatus.Cancelled && !isUploadAborted;

    // Handle unexpected errors
    if (isUnexpectedError) {
      tasksService.updateTask({
        taskId: taskId,
        merge: { status: TaskStatus.Error, subtitle: t('tasks.subtitles.upload-failed') as string },
      });
      errorService.reportError(error, { extra: fileInfoToReport });

      // Handle max space used error
      if (error?.status === HTTP_CODES.MAX_SPACE_USED) {
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
      tasksService.updateTask({
        taskId: taskId,
        merge: { status: TaskStatus.Cancelled },
      });
      next(null);
      return;
    }

    // If relatedTaskId is present, kill upload queue
    if (fileData.relatedTaskId) {
      this.uploadQueue.kill();
    }

    next(error);
  }

  private manageMemoryUsage() {
    if (window?.performance?.memory) {
      const memory = window.performance.memory;

      if (memory && memory?.jsHeapSizeLimit !== null && memory.usedJSHeapSize !== null) {
        const memoryUsagePercentage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        const shouldIncreaseConcurrency =
          memoryUsagePercentage < 0.7 && this.currentGroupBeingUploaded !== FileSizeType.Big;

        if (shouldIncreaseConcurrency) {
          const newConcurrency = Math.min(
            this.uploadQueue.concurrency + 1,
            this.filesGroups[FileSizeType.Small].concurrency,
          );
          if (newConcurrency !== this.uploadQueue.concurrency) {
            console.warn(`Memory usage under 70%. Increasing upload concurrency to ${newConcurrency}`);
            this.uploadQueue.concurrency = newConcurrency;
          }
        }

        const shouldReduceConcurrency = memoryUsagePercentage >= 0.8 && this.uploadQueue.concurrency > 1;

        if (shouldReduceConcurrency) {
          console.warn('Memory usage reached 80%. Reducing upload concurrency.');
          this.uploadQueue.concurrency = 1;
        }
      }
    } else {
      console.warn('Memory usage control is not available');
    }
  }

  private classifyFilesBySize(
    files: UploadManagerFileParams[],
  ): [UploadManagerFileParams[], UploadManagerFileParams[], UploadManagerFileParams[]] {
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

  private handleFailedUploads(filesWithTaskId: (UploadManagerFileParams & { taskId: string })[]): void {
    const filesUploadedTaskId = this.filesUploadedList.map((fileUploaded) => fileUploaded.taskId);
    const failedUploadFiles = filesWithTaskId.filter((file) => !filesUploadedTaskId.includes(file.taskId));

    failedUploadFiles.forEach((fileErrored) => {
      this.updateTaskStatusOnError(fileErrored.taskId);
      this.uploadRepository?.removeUploadState(fileErrored.taskId);
    });
  }

  private updateTaskStatusOnError(taskId: string): void {
    tasksService.updateTask({
      taskId: taskId,
      merge: {
        status: TaskStatus.Error,
      },
    });
  }

  private getFilesWithTaskId(
    items: UploadManagerFileParams[],
    options: Options | undefined,
    abortController: AbortController | undefined,
  ): (UploadManagerFileParams & { taskId: string })[] {
    const filesWithTaskId = [] as (UploadManagerFileParams & { taskId: string })[];

    for (const file of items) {
      const item = { uploadFile: file.filecontent.content, parentFolderId: file.parentFolderId };

      let taskId: string;
      if (file.taskId) {
        taskId = file.taskId;
        tasksService.updateTask({
          taskId: taskId,
          merge: {
            status: TaskStatus.Encrypting,
          },
        });
        if (options) {
          options.isRetriedUpload = true;
        } else {
          options = { isRetriedUpload: true };
        }
      } else {
        const sharedItemAuthenticationData = options?.ownerUserAuthenticationData
          ? {
              ownerUserAuthenticationData: { ...options?.ownerUserAuthenticationData },
              isDeepFolder: !!options?.sharedItemData?.isDeepFolder,
              currentFolderId: options?.sharedItemData?.currentFolderId as string,
            }
          : undefined;

        taskId = tasksService.create<UploadFileTask>({
          relatedTaskId: file.relatedTaskId,
          action: TaskType.UploadFile,
          item,
          fileName: file.filecontent.name,
          fileType: file.filecontent.type,
          isFileNameValidated: true,
          showNotification: options?.showNotifications ?? true,
          cancellable: true,
          sharedItemAuthenticationData,
          stop: async () => {
            if (abortController) abortController?.abort();
            else file?.abortController?.abort();
          },
        });
      }
      filesWithTaskId.push({ ...file, taskId });
    }

    return filesWithTaskId;
  }

  async run(): Promise<DriveFileData[]> {
    let filesWithTaskId = [] as (UploadManagerFileParams & { taskId: string })[];

    try {
      filesWithTaskId = this.getFilesWithTaskId(this.items, this.options, this.abortController);

      const [bigSizedFiles, mediumSizedFiles, smallSizedFiles] = this.classifyFilesBySize(filesWithTaskId);
      const uploadedFilesData: DriveFileData[] = [];

      const uploadFiles = async (files: UploadManagerFileParams[], concurrency: number) => {
        if (this.abortController?.signal.aborted) return [];

        if (files[0]?.relatedTaskId) {
          const uploadStatus = this.uploadRepository?.getUploadState(files[0]?.relatedTaskId);
          const isPaused = (await uploadStatus) === TaskStatus.Paused;
          if (!isPaused) {
            tasksService.updateTask({
              taskId: files[0]?.relatedTaskId,
              merge: {
                status: TaskStatus.InProcess,
              },
            });
          }
        }
        this.uploadQueue.concurrency = concurrency;

        const uploadPromises: Promise<DriveFileData>[] = await this.uploadQueue.pushAsync(files);

        const uploadedFiles = await Promise.all(uploadPromises);

        for (const uploadedFile of uploadedFiles) {
          uploadedFilesData.push(uploadedFile);
        }
      };

      if (smallSizedFiles.length > 0) await uploadFiles(smallSizedFiles, this.filesGroups.small.concurrency);

      this.currentGroupBeingUploaded = FileSizeType.Medium;

      if (mediumSizedFiles.length > 0) await uploadFiles(mediumSizedFiles, this.filesGroups.medium.concurrency);

      this.currentGroupBeingUploaded = FileSizeType.Big;

      if (bigSizedFiles.length > 0) await uploadFiles(bigSizedFiles, this.filesGroups.big.concurrency);

      return uploadedFilesData;
    } catch (error) {
      this.handleFailedUploads(filesWithTaskId);

      errorService.reportError(error);
      throw error;
    }
  }
}
