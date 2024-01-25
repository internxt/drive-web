import { queue, QueueObject } from 'async';
import { randomBytes } from 'crypto';
import uploadFile, { FileToUpload } from '../drive/services/file.service/uploadFile';
import { DriveFileData } from '../drive/types';
import tasksService from '../tasks/services/tasks.service';
import { TaskEvent, TaskStatus, TaskType, UploadFileTask } from '../tasks/types';
import errorService from '../core/services/error.service';
import { ConnectionLostError } from './requests';
import { t } from 'i18next';
import analyticsService from '../analytics/services/analytics.service';
import { HTTP_CODES } from '../core/services/http.service';
import localStorageService from '../core/services/local-storage.service';

const TWENTY_MEGABYTES = 20 * 1024 * 1024;
const USE_MULTIPART_THRESHOLD_BYTES = 50 * 1024 * 1024;

const MAX_UPLOAD_ATTEMPS = 1;

enum FileSizeType {
  Big = 'big',
  Medium = 'medium',
  Small = 'small',
}

type Options = {
  isRetriedUpload?: boolean;
  relatedTaskId?: string;
  showNotifications?: boolean;
  showErrors?: boolean;
  ownerUserAuthenticationData?: {
    token: string;
    bridgeUser: string;
    bridgePass: string;
    encryptionKey: string;
    bucketId: string;
  };
};

type UploadManagerFileParams = {
  filecontent: FileToUpload;
  taskId?: string;
  fileType?: string;
  userEmail: string;
  parentFolderId: number;
  onFinishUploadFile?: (driveItemData: DriveFileData) => void;
  abortController?: AbortController;
};

export const uploadFileWithManager = (
  files: UploadManagerFileParams[],
  maxSpaceOccupiedCallback: () => void,
  abortController?: AbortController,
  options?: Options,
  relatedTaskProgress?: { filesUploaded: number; totalFilesToUpload: number },
): Promise<DriveFileData[]> => {
  const uploadManager = new UploadManager(
    files,
    maxSpaceOccupiedCallback,
    abortController,
    options,
    relatedTaskProgress,
  );
  return uploadManager.run();
};

class UploadManager {
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

  private errored = false;
  private uploadsProgress: Record<string, number> = {};
  private uploadQueue: QueueObject<UploadManagerFileParams> = queue<UploadManagerFileParams & { taskId: string }>(
    (fileData, next: (err: Error | null, res?: DriveFileData) => void) => {
      if (this.abortController?.signal.aborted ?? fileData.abortController?.signal.aborted) return;

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

      const existsRelatedTask = !!this.options?.relatedTaskId;
      if (!existsRelatedTask) localStorageService.setUploadState(taskId, TaskStatus.InProcess);

      const retyUploadType = fileData.fileType;

      const upload = () => {
        uploadAttempts++;
        const isMultipleUpload = this.items.length > 1 ? 1 : 0;

        if (!existsRelatedTask)
          tasksService.updateTask({
            taskId: taskId,
            merge: {
              status: TaskStatus.InProcess,
            },
          });

        const uploadStatus = localStorageService.getUploadState(this.options?.relatedTaskId ?? taskId);
        const isPaused = uploadStatus?.status === TaskStatus.Paused;
        const continueUploadOptions = {
          taskId: this.options?.relatedTaskId ?? taskId,
          isPaused,
          isRetriedUpload: !!this.options?.isRetriedUpload,
        };

        uploadFile(
          fileData.userEmail,
          {
            name: file.name,
            size: file.size,
            type: retyUploadType ?? file.type,
            content: file.content,
            parentFolderId: file.parentFolderId,
          },
          (uploadProgress) => {
            this.uploadsProgress[uploadId] = uploadProgress;
            if (task?.status !== TaskStatus.Cancelled) {
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
            trackingParameters: { isMultipleUpload, processIdentifier: this.uploadUUIDV4 },
            abortController: this.abortController ?? fileData.abortController,
            ownerUserAuthenticationData: this.options?.ownerUserAuthenticationData,
            abortCallback: (abort?: () => void) =>
              tasksService.addListener({
                event: TaskEvent.TaskCancelled,
                listener: () => {
                  abort?.();
                },
              }),
          },
          continueUploadOptions,
        )
          .then((driveFileData) => {
            const isUploadAborted = this.abortController?.signal.aborted ?? fileData.abortController?.signal.aborted;

            if (isUploadAborted) {
              throw Error('Upload task cancelled');
            }

            const driveFileDataWithNameParsed = { ...driveFileData, name: file.name };

            if (this.relatedTaskProgress && this.options?.relatedTaskId) {
              this.relatedTaskProgress.filesUploaded += 1;

              tasksService.updateTask({
                taskId: this.options?.relatedTaskId,
                merge: {
                  progress: this.relatedTaskProgress.filesUploaded / this.relatedTaskProgress.totalFilesToUpload,
                },
              });
            }

            tasksService.updateTask({
              taskId: taskId,
              merge: { status: TaskStatus.Success, itemUUID: { fileUUID: driveFileData.uuid } },
            });

            localStorageService.removeUploadState(taskId);

            fileData.onFinishUploadFile?.(driveFileDataWithNameParsed);

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
            next(null, driveFileDataWithNameParsed);
          })
          .catch((err) => {
            const isUploadAborted =
              this.abortController?.signal.aborted ?? fileData.abortController?.signal.aborted ?? err === 'abort';
            const isLostConnectionError = err instanceof ConnectionLostError || err.message === 'Network Error';

            if (uploadAttempts < MAX_UPLOAD_ATTEMPS && !isUploadAborted && !isLostConnectionError) {
              upload();
            } else {
              const fileInfoToReport = {
                name: file.name,
                size: file.size,
                type: fileData.fileType ?? file.type,
                parentFolderId: file.parentFolderId,
                uploadProgress: this.uploadsProgress[uploadId] ?? 0,
                filesUploaded: this.relatedTaskProgress
                  ? this.relatedTaskProgress?.filesUploaded / this.relatedTaskProgress?.totalFilesToUpload
                  : 'unknown',
                context: err?.context,
                errStatus: err?.status,
              };

              if (isLostConnectionError) {
                errorService.reportError(err, {
                  extra: fileInfoToReport,
                });
                tasksService.updateTask({
                  taskId,
                  merge: { status: TaskStatus.Error, subtitle: t('error.connectionLostError') ?? undefined },
                });
                this.errored = true;
                next(err);
                return;
              }

              const isUnexpectedError = task?.status !== TaskStatus.Cancelled && !isUploadAborted;
              if (isUnexpectedError) {
                tasksService.updateTask({
                  taskId: taskId,
                  merge: { status: TaskStatus.Error, subtitle: t('tasks.subtitles.upload-failed') as string },
                });
                errorService.reportError(err, {
                  extra: fileInfoToReport,
                });

                if (err?.status === HTTP_CODES.MAX_SPACE_USED) {
                  this.maxSpaceOccupiedCallback();
                }
              }

              if (isUploadAborted) {
                tasksService.updateTask({
                  taskId: taskId,
                  merge: { status: TaskStatus.Cancelled },
                });
              }

              if (!this.errored && !isUploadAborted) {
                this.uploadQueue.kill();
              }

              if (!isUploadAborted) this.errored = true;

              tasksService.updateTask({
                taskId: this.options?.relatedTaskId ?? taskId,
                merge: { status: TaskStatus.Error },
              });
              next(err);
            }
          });
      };

      upload();
    },
    this.filesGroups.small.concurrency,
  );

  private abortController?: AbortController;
  private items: UploadManagerFileParams[];
  private options?: Options;
  private relatedTaskProgress?: { filesUploaded: number; totalFilesToUpload: number };
  private uploadUUIDV4: string;
  private maxSpaceOccupiedCallback: () => void;

  constructor(
    items: UploadManagerFileParams[],
    maxSpaceOccupiedCallback: () => void,
    abortController?: AbortController,
    options?: Options,
    relatedTaskProgress?: { filesUploaded: number; totalFilesToUpload: number },
  ) {
    this.items = items;
    this.abortController = abortController;
    this.options = options;
    this.relatedTaskProgress = relatedTaskProgress;
    this.uploadUUIDV4 = analyticsService.getTrackingActionId();
    this.maxSpaceOccupiedCallback = maxSpaceOccupiedCallback;
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

  async run(): Promise<DriveFileData[]> {
    try {
      const filesWithTaskId = [] as (UploadManagerFileParams & { taskId: string })[];
      for (const file of this.items) {
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
          if (this.options) {
            this.options.isRetriedUpload = true;
          } else {
            this.options = { isRetriedUpload: true };
          }
        } else {
          taskId = tasksService.create<UploadFileTask>({
            relatedTaskId: this.options?.relatedTaskId,
            action: TaskType.UploadFile,
            item,
            fileName: file.filecontent.name,
            fileType: file.filecontent.type,
            isFileNameValidated: true,
            showNotification: this.options?.showNotifications ?? true,
            cancellable: true,
            stop: async () => {
              if (this.abortController) this.abortController?.abort();
              else file?.abortController?.abort();
            },
          });
        }
        filesWithTaskId.push({ ...file, taskId });
      }

      const [bigSizedFiles, mediumSizedFiles, smallSizedFiles] = this.classifyFilesBySize(filesWithTaskId);
      const filesReferences: DriveFileData[] = [];

      const uploadFiles = async (files: UploadManagerFileParams[], concurrency: number) => {
        if (this.abortController?.signal.aborted) return [];

        if (this.options?.relatedTaskId)
          tasksService.updateTask({
            taskId: this.options?.relatedTaskId,
            merge: {
              status: TaskStatus.InProcess,
            },
          });

        this.uploadQueue.concurrency = concurrency;

        const uploadPromises: Promise<DriveFileData>[] = await this.uploadQueue.pushAsync(files);

        const uploadedFiles = await Promise.all(uploadPromises);

        for (const uploadedFile of uploadedFiles) {
          filesReferences.push(uploadedFile);
        }
      };

      if (smallSizedFiles.length > 0) await uploadFiles(smallSizedFiles, this.filesGroups.small.concurrency);

      if (mediumSizedFiles.length > 0) await uploadFiles(mediumSizedFiles, this.filesGroups.medium.concurrency);

      if (bigSizedFiles.length > 0) await uploadFiles(bigSizedFiles, this.filesGroups.big.concurrency);

      return filesReferences;
    } catch (error) {
      errorService.reportError(error);
      throw error;
    }
  }
}
