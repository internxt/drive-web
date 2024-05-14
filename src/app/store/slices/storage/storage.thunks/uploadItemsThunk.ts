import { items as itemUtils } from '@internxt/lib';
import { SharedFiles } from '@internxt/sdk/dist/drive/share/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { renameFile } from 'app/crypto/services/utils';
import { FileToUpload } from 'app/drive/services/file.service/uploadFile';
import { MAX_ALLOWED_UPLOAD_SIZE } from 'app/drive/services/network.service';
import { DriveFileData, DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

import { t } from 'i18next';

import { storageActions } from '..';
import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import errorService from '../../../../core/services/error.service';
import { HTTP_CODES } from '../../../../core/services/http.service';
import AppError from '../../../../core/types';
import newStorageService from '../../../../drive/services/new-storage.service';
import { uploadFileWithManager } from '../../../../network/UploadManager';
import DatabaseUploadRepository from '../../../../repositories/DatabaseUploadRepository';
import shareService from '../../../../share/services/share.service';
import tasksService from '../../../../tasks/services/tasks.service';
import { TaskStatus, TaskType, UploadFileTask } from '../../../../tasks/types';
import { planThunks } from '../../plan';
import { uiActions } from '../../ui';
import { StorageState } from '../storage.model';

interface UploadItemsThunkOptions {
  relatedTaskId: string;
  showNotifications: boolean;
  showErrors: boolean;
  abortController?: AbortController;
  onSuccess: () => void;
  isRetriedUpload?: boolean;
  disableDuplicatedNamesCheck?: boolean;
}

interface UploadItemsPayload {
  files: File[];
  taskId?: string;
  fileType?: string;
  parentFolderId: number;
  options?: Partial<UploadItemsThunkOptions>;
  filesProgress?: { filesUploaded: number; totalFilesToUpload: number };
}

const DEFAULT_OPTIONS: Partial<UploadItemsThunkOptions> = { showNotifications: true, showErrors: true };

const showEmptyFilesNotification = (zeroLengthFilesNumber: number) => {
  if (zeroLengthFilesNumber > 0) {
    const fileText = zeroLengthFilesNumber === 1 ? 'file' : 'files';

    notificationsService.show({
      text: `Empty files are not supported.\n${zeroLengthFilesNumber} empty ${fileText} not uploaded.`,
      type: ToastType.Warning,
    });
  }
};

/**
 * Checks if the upload is allowed based on plan limits and file sizes.
 *
 * @param {RootState} state - The current state of the application
 * @param {File[]} files - The files to be uploaded
 * @param {function} dispatch - The dispatch function for Redux actions
 * @return {boolean} Indicates whether the upload is allowed
 */
const isUploadAllowed = ({ state, files, dispatch }: { state: RootState; files: File[]; dispatch }): boolean => {
  try {
    const planLimit = state.plan.planLimit;
    const planUsage = state.plan.planUsage;
    const uploadItemsSize = Object.values(files).reduce((acum, file) => acum + file.size, 0);
    const totalItemsSize = uploadItemsSize + planUsage;
    const isPlanSizeLimitExceeded = planLimit && totalItemsSize >= planLimit;

    if (isPlanSizeLimitExceeded) {
      dispatch(uiActions.setIsReachedPlanLimitDialogOpen(true));
      return false;
    }
  } catch (err: unknown) {
    errorService.reportError(err);
  }

  const isAnyFileExceededSizeLimit = files.some((file) => file.size > MAX_ALLOWED_UPLOAD_SIZE);
  if (isAnyFileExceededSizeLimit) {
    notificationsService.show({
      text: t('error.maxSizeUploadLimitError'),
      type: ToastType.Warning,
    });
    return false;
  }

  return true;
};

/**
 * Prepares files to be uploaded to a specified parent folder.
 *
 * @param {Object} options - The options for preparing files to upload.
 * @param {File[]} options.files - The files to be uploaded.
 * @param {number} options.parentFolderId - The ID of the parent folder.
 * @param {boolean} [options.disableDuplicatedNamesCheck] - Whether to disable checking for duplicated file names.
 * @param {string} [options.fileType] - The type of the file.
 * @returns {Promise<{ filesToUpload: FileToUpload[]; zeroLengthFilesNumber: number }>} - A promise that resolves to an object containing the files to upload and the number of zero-length files.
 */
const prepareFilesToUpload = async ({
  files,
  parentFolderId,
  disableDuplicatedNamesCheck,
  fileType,
}: {
  files: File[];
  parentFolderId: number;
  disableDuplicatedNamesCheck?: boolean;
  fileType?: string;
}): Promise<{ filesToUpload: FileToUpload[]; zeroLengthFilesNumber: number }> => {
  const filesToUpload: FileToUpload[] = [];
  const storageClient = SdkFactory.getInstance().createStorageClient();

  let parentFolderContent;
  if (!disableDuplicatedNamesCheck) {
    const [parentFolderContentPromise] = storageClient.getFolderContent(parentFolderId);
    parentFolderContent = await parentFolderContentPromise;
  }

  let zeroLengthFilesNumber = 0;

  for (const file of files) {
    if (file.size === 0) {
      zeroLengthFilesNumber = zeroLengthFilesNumber + 1;
      continue;
    }
    const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
    let fileContent;
    let finalFilename = filename;

    if (!disableDuplicatedNamesCheck) {
      const [, , renamedFilename] = itemUtils.renameIfNeeded(parentFolderContent.files, filename, extension);
      finalFilename = renamedFilename;
      fileContent = renameFile(file, renamedFilename);
    } else {
      fileContent = renameFile(file, filename);
    }

    filesToUpload.push({
      name: finalFilename,
      size: file.size,
      type: extension ?? fileType,
      content: fileContent,
      parentFolderId,
    });
  }

  return { filesToUpload, zeroLengthFilesNumber };
};

/**
 * Checks if the given file size exceeds the size limit by calling the `checkSizeLimit` function from the `newStorageService` API.
 *
 * @param {number} fileSize - The size of the file in bytes.
 * @return {Promise<boolean>} A promise that resolves to `true` if the file size is within the limit, or `false` if it exceeds the limit and a payment is required.
 */
const checkSizeLimit = async (fileSize: number): Promise<boolean> => {
  try {
    await newStorageService.checkSizeLimit(fileSize);
    return true;
  } catch (error) {
    if ((error as AppError)?.status === HTTP_CODES.PAYMENT_REQUIRED) {
      return false;
    }

    return true;
  }
};

/**
 * Processes the files to check if their sizes exceed the limit and separates them into allowed and exceeding files.
 *
 * @param {File[]} files - The array of files to be checked.
 * @param {function} dispatch - The dispatch function for Redux actions.
 * @return {Object} An object containing files allowed and files exceeding the size limit.
 */
const processFileCheckSizeLimit = async (files: File[], dispatch) => {
  const filesAllowed = [] as File[];
  const filesSizeExceed = [] as File[];

  await Promise.all(
    files.map(async (file) => {
      const isFileSizeAllowed = await checkSizeLimit(file.size);

      if (isFileSizeAllowed) {
        filesAllowed.push(file);
      } else {
        filesSizeExceed.push(file);
        dispatch(uiActions.setIsFileSizeLimitDialogOpen(true));
      }
    }),
  );

  return { filesAllowed, filesSizeExceed };
};

/**
 * Displays files that exceed the size limit in the task logger.
 *
 * @param {File[]} files - The array of files to display in the task logger.
 * @param {number} parentFolderId - The ID of the parent folder.
 */
const displayInTaskLoggerExceededSizeLimitFiles = (files: File[], parentFolderId: number) => {
  files.map((file) => {
    const taskId = tasksService.create<UploadFileTask>({
      action: TaskType.UploadFile,
      subtitle: t('tasks.upload-file.errors.fileSizeLimitExceeded') ?? undefined,
      item: { uploadFile: file, parentFolderId },
      fileName: file.name,
      fileType: file.type,
      isFileNameValidated: true,
      showNotification: true,
      cancellable: false,
      displayRetry: false,
    });
    tasksService.updateTask({
      taskId: taskId,
      merge: {
        status: TaskStatus.Error,
      },
    });
  });
};

/**
 * @description
 *  1. Prepare files to upload
 *  2. Schedule tasks
 */
export const uploadItemsThunk = createAsyncThunk<void, UploadItemsPayload, { state: RootState }>(
  'storage/uploadItems',
  async ({ files, parentFolderId, options, taskId, fileType }: UploadItemsPayload, { getState, dispatch }) => {
    const user = getState().user.user as UserSettings;
    const errors: Error[] = [];

    options = Object.assign(DEFAULT_OPTIONS, options ?? {});

    const continueWithUpload = isUploadAllowed({ state: getState(), files, dispatch });
    if (!continueWithUpload) return;

    const { filesAllowed, filesSizeExceed } = await processFileCheckSizeLimit(files, dispatch);
    displayInTaskLoggerExceededSizeLimitFiles(filesSizeExceed, parentFolderId);

    const { filesToUpload, zeroLengthFilesNumber } = await prepareFilesToUpload({
      files: filesAllowed,
      parentFolderId,
      disableDuplicatedNamesCheck: options.disableDuplicatedNamesCheck,
      fileType,
    });

    showEmptyFilesNotification(zeroLengthFilesNumber);

    const filesToUploadData = filesToUpload.map((file) => ({
      filecontent: file,
      fileType,
      userEmail: user.email,
      parentFolderId,
      taskId,
      onFinishUploadFile: (driveItemData: DriveFileData, taskId: string) => {
        const uploadRespository = DatabaseUploadRepository.getInstance();
        uploadRespository.removeUploadState(taskId);

        dispatch(
          storageActions.pushItems({
            updateRecents: true,
            folderIds: [parentFolderId],
            items: [driveItemData as DriveItemData],
          }),
        );
      },
      abortController: new AbortController(),
    }));

    const openMaxSpaceOccupiedDialog = () => dispatch(uiActions.setIsReachedPlanLimitDialogOpen(true));

    try {
      await uploadFileWithManager(
        filesToUploadData,
        openMaxSpaceOccupiedDialog,
        DatabaseUploadRepository.getInstance(),
      );
    } catch (error) {
      errors.push(error as Error);
    }

    options.onSuccess?.();

    setTimeout(() => {
      dispatch(planThunks.fetchUsageThunk());
    }, 1000);

    if (errors.length > 0) {
      for (const error of errors) {
        if (error.message) notificationsService.show({ text: error.message, type: ToastType.Error });
      }
    }
  },
);

interface UploadSharedItemsPayload extends UploadItemsPayload {
  currentFolderId: string;
  ownerUserAuthenticationData?: {
    token: string;
    bridgeUser: string;
    bridgePass: string;
    encryptionKey: string;
    bucketId: string;
  };
  isDeepFolder: boolean;
}
/**
 * @description
 *  1. Prepare files to upload
 *  2. Schedule tasks
 */
export const uploadSharedItemsThunk = createAsyncThunk<void, UploadSharedItemsPayload, { state: RootState }>(
  'storage/uploadItems',
  async (
    {
      files,
      taskId,
      fileType,
      parentFolderId,
      options,
      ownerUserAuthenticationData,
      currentFolderId,
      isDeepFolder,
    }: UploadSharedItemsPayload,
    { getState, dispatch },
  ) => {
    const user = getState().user.user as UserSettings;
    const filesToUpload: FileToUpload[] = [];
    const errors: Error[] = [];

    options = Object.assign(DEFAULT_OPTIONS, options || {});

    const continueWithUpload = await isUploadAllowed({ state: getState(), files, dispatch });
    if (!continueWithUpload) return;

    const { filesAllowed, filesSizeExceed } = await processFileCheckSizeLimit(files, dispatch);
    displayInTaskLoggerExceededSizeLimitFiles(filesSizeExceed, parentFolderId);

    let zeroLengthFilesNumber = 0;
    for (const file of filesAllowed) {
      if (file.size === 0) {
        zeroLengthFilesNumber = zeroLengthFilesNumber + 1;
        continue;
      }
      const { filename, extension } = itemUtils.getFilenameAndExt(file.name);

      let page = 0;
      const offset = 50;
      let allItems: SharedFiles[] = [];

      let hasMoreItems = true;

      while (hasMoreItems) {
        const parentFolderContent = await shareService.getSharedFolderContent(
          currentFolderId,
          'files',
          isDeepFolder ? ownerUserAuthenticationData?.token ?? '' : '',
          page,
          offset,
        );
        const parentFolderFiles = parentFolderContent.items;

        if (parentFolderFiles.length === 0 || parentFolderFiles.length < offset) hasMoreItems = false;

        allItems = allItems.concat(parentFolderFiles as SharedFiles[]);
        page++;
      }

      const [, , finalFilename] = itemUtils.renameIfNeeded(
        allItems.map((item) => ({ ...item, name: item.plainName })),
        filename,
        extension,
      );
      const fileContent = renameFile(file, finalFilename);

      filesToUpload.push({
        name: finalFilename,
        size: file.size,
        type: fileType ?? extension,
        content: fileContent,
        parentFolderId,
      });
    }
    showEmptyFilesNotification(zeroLengthFilesNumber);

    const filesToUploadData = filesToUpload.map((file) => ({
      filecontent: file,
      fileType: file.type,
      userEmail: user.email,
      taskId,
      parentFolderId,
      onFinishUploadFile: (driveItemData: DriveFileData, taskId: string) => {
        const uploadRespository = DatabaseUploadRepository.getInstance();
        uploadRespository.removeUploadState(taskId);
        dispatch(
          storageActions.pushItems({
            updateRecents: true,
            folderIds: [parentFolderId],
            items: [driveItemData as DriveItemData],
          }),
        );
      },
      abortController: new AbortController(),
    }));

    const openMaxSpaceOccupiedDialog = () => dispatch(uiActions.setIsReachedPlanLimitDialogOpen(true));

    try {
      await uploadFileWithManager(
        filesToUploadData,
        openMaxSpaceOccupiedDialog,
        DatabaseUploadRepository.getInstance(),
        undefined,
        {
          ownerUserAuthenticationData,
          sharedItemData: {
            isDeepFolder,
            currentFolderId,
          },
        },
      );
    } catch (error) {
      errors.push(error as Error);
    }

    options.onSuccess?.();

    setTimeout(() => {
      dispatch(planThunks.fetchUsageThunk());
    }, 1000);

    if (errors.length > 0) {
      for (const error of errors) {
        if (error.message) notificationsService.show({ text: error.message, type: ToastType.Error });
      }
    }
  },
);

/**
 * @description
 *  1. Prepare files to upload
 *  2. Schedule tasks
 */
export const uploadItemsParallelThunk = createAsyncThunk<void, UploadItemsPayload, { state: RootState }>(
  'storage/uploadItems',
  async ({ files, parentFolderId, options, filesProgress }: UploadItemsPayload, { getState, dispatch }) => {
    const user = getState().user.user as UserSettings;
    const errors: Error[] = [];
    const abortController = options?.abortController ?? new AbortController();

    options = Object.assign(DEFAULT_OPTIONS, options ?? {});

    const { filesAllowed, filesSizeExceed } = await processFileCheckSizeLimit(files, dispatch);
    displayInTaskLoggerExceededSizeLimitFiles(filesSizeExceed, parentFolderId);

    const { filesToUpload, zeroLengthFilesNumber } = await prepareFilesToUpload({
      files: filesAllowed,
      parentFolderId,
      disableDuplicatedNamesCheck: options.disableDuplicatedNamesCheck,
    });

    showEmptyFilesNotification(zeroLengthFilesNumber);

    const filesToUploadData = filesToUpload.map((file) => ({
      filecontent: file,
      userEmail: user.email,
      parentFolderId,
      // TODO: EXTRACT WHEN MANAGE UPLOAD TASK IS MERGED
      onFinishUploadFile: (driveItemData: DriveFileData) => {
        dispatch(
          storageActions.pushItems({
            updateRecents: true,
            folderIds: [parentFolderId],
            items: [driveItemData as DriveItemData],
          }),
        );
      },
    }));

    const openMaxSpaceOccupiedDialog = () => dispatch(uiActions.setIsReachedPlanLimitDialogOpen(true));

    try {
      await uploadFileWithManager(
        filesToUploadData,
        openMaxSpaceOccupiedDialog,
        DatabaseUploadRepository.getInstance(),
        abortController,
        options,
        filesProgress,
      );
    } catch (error) {
      errors.push(error as Error);
    }

    options.onSuccess?.();

    if (errors.length > 0) {
      for (const error of errors) {
        if (error.message) notificationsService.show({ text: error.message, type: ToastType.Error });
      }

      throw new Error(t('error.uploadingItems') as string);
    }
  },
);

export const uploadItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(uploadItemsThunk.pending, () => undefined)
    .addCase(uploadItemsThunk.fulfilled, () => undefined)
    .addCase(uploadItemsThunk.rejected, (state, action) => {
      const requestOptions = Object.assign(DEFAULT_OPTIONS, action.meta.arg.options ?? {});
      if (requestOptions?.showErrors) {
        notificationsService.show({
          text: t('error.uploadingFile', { reason: action.error.message ?? '' }),
          type: ToastType.Error,
        });
      }
    });
};
