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
import { uploadFileWithManager } from '../../../../network/UploadManager';
import DatabaseUploadRepository from '../../../../repositories/DatabaseUploadRepository';
import shareService from '../../../../share/services/share.service';
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

const DEFAULT_OPTIONS: Partial<UploadItemsThunkOptions> = {
  showNotifications: true,
  showErrors: true,
};

const showEmptyFilesNotification = (zeroLengthFilesNumber: number) => {
  if (zeroLengthFilesNumber > 0) {
    const fileText = zeroLengthFilesNumber === 1 ? 'file' : 'files';

    notificationsService.show({
      text: `Empty files are not supported.\n${zeroLengthFilesNumber} empty ${fileText} not uploaded.`,
      type: ToastType.Warning,
    });
  }
};

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
 * @description
 *  1. Prepare files to upload
 *  2. Schedule tasks
 */
export const uploadItemsThunk = createAsyncThunk<void, UploadItemsPayload, { state: RootState }>(
  'storage/uploadItems',
  async (
    { files, parentFolderId, options: payloadOptions, taskId, fileType }: UploadItemsPayload,
    { getState, dispatch },
  ) => {
    const user = getState().user.user as UserSettings;
    const errors: Error[] = [];

    const options = { ...DEFAULT_OPTIONS, ...payloadOptions };

    const continueWithUpload = isUploadAllowed({ state: getState(), files, dispatch });
    if (!continueWithUpload) return;

    const { filesToUpload, zeroLengthFilesNumber } = await prepareFilesToUpload({
      files,
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
      relatedTaskId: options?.relatedTaskId,
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
      options: payloadOptions,
      ownerUserAuthenticationData,
      currentFolderId,
      isDeepFolder,
    }: UploadSharedItemsPayload,
    { getState, dispatch },
  ) => {
    const user = getState().user.user as UserSettings;
    const filesToUpload: FileToUpload[] = [];
    const errors: Error[] = [];

    const options = { ...DEFAULT_OPTIONS, ...payloadOptions };

    const continueWithUpload = isUploadAllowed({ state: getState(), files, dispatch });
    if (!continueWithUpload) return;

    let zeroLengthFilesNumber = 0;
    for (const file of files) {
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
      relatedTaskId: options?.relatedTaskId,
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
  'storage/uploadParallelItems',
  async (
    { files, parentFolderId, options: payloadOptions, filesProgress }: UploadItemsPayload,
    { getState, dispatch },
  ) => {
    const user = getState().user.user as UserSettings;
    const errors: Error[] = [];
    const abortController = payloadOptions?.abortController ?? new AbortController();

    const options = { ...DEFAULT_OPTIONS, ...payloadOptions };

    const { filesToUpload, zeroLengthFilesNumber } = await prepareFilesToUpload({
      files,
      parentFolderId,
      disableDuplicatedNamesCheck: options.disableDuplicatedNamesCheck,
    });

    showEmptyFilesNotification(zeroLengthFilesNumber);

    const filesToUploadData = filesToUpload.map((file) => ({
      filecontent: file,
      userEmail: user.email,
      parentFolderId,
      relatedTaskId: options?.relatedTaskId,
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
    })
    .addCase(uploadItemsParallelThunk.pending, () => undefined)
    .addCase(uploadItemsParallelThunk.fulfilled, () => undefined)
    .addCase(uploadItemsParallelThunk.rejected, (state, action) => {
      const requestOptions = Object.assign(DEFAULT_OPTIONS, action.meta.arg.options ?? {});
      if (requestOptions?.showErrors) {
        notificationsService.show({
          text: t('error.uploadingFile', { reason: action.error.message ?? '' }),
          type: ToastType.Error,
        });
      }
    });
};
