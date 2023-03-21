import { queue, QueueObject } from 'async';
import { randomBytes } from 'crypto';
import uploadFile, { FileToUpload } from '../drive/services/file.service/uploadFile';
import { DriveFileData } from '../drive/types';
import tasksService from '../tasks/services/tasks.service';
import { TaskStatus, TaskType, UploadFileTask } from '../tasks/types';

const TWENTY_MEGABYTES = 20 * 1024 * 1024;
const USE_MULTIPART_THRESHOLD_BYTES = 50 * 1024 * 1024;

enum FileSizeType {
  Big = 'big',
  Medium = 'medium',
  Small = 'small',
}

type Options = { relatedTaskId?: string; showNotifications?: boolean; showErrors?: boolean };

type UploadManagerFileParams = {
  filecontent: FileToUpload;
  userEmail: string;
  parentFolderId: number;
  onFinishUploadFile?: (driveItemData: DriveFileData) => void;
  abortController?: AbortController;
};

export const uploadFileWithManager = (
  files: UploadManagerFileParams[],
  abortController?: AbortController,
  options?: Options,
  relatedTaskProgress?: { filesUploaded: number; totalFilesToUpload: number },
): Promise<DriveFileData[]> => {
  const uploadManager = new UploadManager(files, abortController, options, relatedTaskProgress);
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
      if (this.abortController?.signal.aborted || fileData.abortController?.signal.aborted) return;

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

      uploadFile(
        fileData.userEmail,
        {
          name: file.name,
          size: file.size,
          type: file.type,
          content: file.content,
          parentFolderId: file.parentFolderId,
        },
        false,
        (uploadProgress) => {
          this.uploadsProgress[uploadId] = uploadProgress;

          if (task?.status !== TaskStatus.Cancelled) {
            tasksService.updateTask({
              taskId: taskId,
              merge: {
                status: TaskStatus.InProcess,
                progress: uploadProgress,
              },
            });
          }
        },
        this.abortController ?? fileData.abortController,
      )
        .then((driveFileData) => {
          if (this.abortController?.signal.aborted || fileData.abortController?.signal.aborted)
            throw Error('Task cancelled');

          const driveFileDataWithNameParsed = { ...driveFileData, name: file.name };

          if (this.relatedTaskProgress && this.options?.relatedTaskId) {
            this.relatedTaskProgress.filesUploaded += 1;

            tasksService.updateTask({
              taskId: this.options?.relatedTaskId,
              merge: {
                status: TaskStatus.InProcess,
                progress: this.relatedTaskProgress.filesUploaded / this.relatedTaskProgress.totalFilesToUpload,
              },
            });
          }

          tasksService.updateTask({
            taskId: taskId,
            merge: { status: TaskStatus.Success },
          });

          fileData.onFinishUploadFile?.(driveFileDataWithNameParsed);

          next(null, driveFileDataWithNameParsed);
        })
        .catch((err) => {
          if (task?.status !== TaskStatus.Cancelled) {
            tasksService.updateTask({
              taskId: taskId,
              merge: { status: TaskStatus.Error },
            });
          }

          if (!this.errored) {
            this.uploadQueue.kill();
          }

          if (this.abortController?.signal.aborted || fileData.abortController?.signal.aborted) {
            return tasksService.updateTask({
              taskId: taskId,
              merge: { status: TaskStatus.Cancelled },
            });
          }

          this.errored = true;

          next(err);
        });
    },
    this.filesGroups.small.concurrency,
  );

  private abortController?: AbortController;
  private items: UploadManagerFileParams[];
  private options?: Options;
  private relatedTaskProgress?: { filesUploaded: number; totalFilesToUpload: number };

  constructor(
    items: UploadManagerFileParams[],
    abortController?: AbortController,
    options?: Options,
    relatedTaskProgress?: { filesUploaded: number; totalFilesToUpload: number },
  ) {
    this.items = items;
    this.abortController = abortController;
    this.options = options;
    this.relatedTaskProgress = relatedTaskProgress;
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
        const taskId = tasksService.create<UploadFileTask>({
          relatedTaskId: this.options?.relatedTaskId,
          action: TaskType.UploadFile,
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
      console.log(error);
      return [];
    }
  }
}
