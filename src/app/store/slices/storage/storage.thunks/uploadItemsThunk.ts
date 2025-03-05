import { items as itemUtils } from '@internxt/lib';
import { SharedFiles } from '@internxt/sdk/dist/drive/share/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { renameFile } from 'app/crypto/services/utils';
import { MAX_ALLOWED_UPLOAD_SIZE } from 'app/drive/services/network.service';
import { DriveFileData, DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

import { t } from 'i18next';

import { storageActions } from '..';
import { RootState } from '../../..';
import errorService from '../../../../core/services/error.service';
import workspacesService from '../../../../core/services/workspace.service';
import { uploadFileWithManager } from '../../../../network/UploadManager';
import DatabaseUploadRepository from '../../../../repositories/DatabaseUploadRepository';
import shareService from '../../../../share/services/share.service';
import { planThunks } from '../../plan';
import { uiActions } from '../../ui';
import workspacesSelectors from '../../workspaces/workspaces.selectors';

import { prepareFilesToUpload } from '../fileUtils/prepareFilesToUpload';
import { StorageState } from '../storage.model';
import { FileToUpload } from '../../../../drive/services/file.service/types';

interface UploadItemsThunkOptions {
  relatedTaskId: string;
  showNotifications: boolean;
  showErrors: boolean;
  abortController?: AbortController;
  onSuccess: () => void;
  isRetriedUpload?: boolean;
  disableDuplicatedNamesCheck?: boolean;
  disableExistenceCheck?: boolean;
}

interface UploadItemsPayload {
  files: File[];
  taskId?: string;
  fileType?: string;
  parentFolderId: string;
  options?: Partial<UploadItemsThunkOptions>;
  filesProgress?: { filesUploaded: number; totalFilesToUpload: number };
  onFileUploadCallback?: (driveFileData: DriveFileData) => void;
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

const isUploadAllowed = ({
  state,
  files,
  dispatch,
  isWorkspaceSelected,
}: {
  state: RootState;
  files: File[];
  dispatch;
  isWorkspaceSelected: boolean;
}): boolean => {
  try {
    const planLimit = isWorkspaceSelected ? state.plan.businessPlanLimit : state.plan.planLimit;
    const planUsage = isWorkspaceSelected ? state.plan.businessPlanUsage : state.plan.planUsage;
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

    const state = getState();
    const selectedWorkspace = workspacesSelectors.getSelectedWorkspace(state);
    const workspaceCredentials = workspacesSelectors.getWorkspaceCredentials(state);
    const memberId = selectedWorkspace?.workspaceUser?.memberId;

    let ownerUserAuthenticationData: any = null;
    const workspaceId = selectedWorkspace?.workspace?.id;
    if (workspaceId) {
      ownerUserAuthenticationData = {
        bridgeUser: workspaceCredentials?.credentials.networkUser,
        bridgePass: workspaceCredentials?.credentials.networkPass,
        encryptionKey: selectedWorkspace?.workspaceUser?.key,
        bucketId: workspaceCredentials?.bucket,
        workspaceId: workspaceId,
        workspacesToken: workspaceCredentials?.tokenHeader,
      };
    }

    const continueWithUpload = isUploadAllowed({
      state: getState(),
      files,
      dispatch,
      isWorkspaceSelected: !!workspaceId,
    });
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
        undefined,
        {
          ownerUserAuthenticationData: ownerUserAuthenticationData ?? undefined,
          sharedItemData: {
            isDeepFolder: false,
            currentFolderId: parentFolderId,
          },
        },
      );
    } catch (error) {
      errors.push(error as Error);
    }

    options.onSuccess?.();

    setTimeout(() => {
      dispatch(planThunks.fetchUsageThunk());
      if (memberId) dispatch(planThunks.fetchBusinessLimitUsageThunk());
    }, 1000);

    if (errors.length > 0) {
      for (const error of errors) {
        if (error.message) {
          console.error('message Error when upload', error.message);
          notificationsService.show({ text: error.message, type: ToastType.Error });
        }
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
    const state = getState();
    const user = state.user.user as UserSettings;
    const filesToUpload: FileToUpload[] = [];
    const errors: Error[] = [];

    const selectedWorkspace = workspacesSelectors.getSelectedWorkspace(state);
    const workspaceCredentials = workspacesSelectors.getWorkspaceCredentials(state);

    const workspaceId = selectedWorkspace?.workspace.id;
    const memberId = selectedWorkspace?.workspaceUser?.memberId;
    const teamId = selectedWorkspace?.workspace.defaultTeamId;
    const options = { ...DEFAULT_OPTIONS, ...payloadOptions };

    const continueWithUpload = isUploadAllowed({ state: state, files, dispatch, isWorkspaceSelected: !!workspaceId });
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
        let parentFolderContent;
        if (workspaceId && teamId) {
          const [promise] = workspacesService.getAllWorkspaceTeamSharedFolderFiles(
            workspaceId,
            currentFolderId,
            page,
            offset,
            isDeepFolder ? (ownerUserAuthenticationData?.token ?? '') : '',
          );
          const response = await promise;
          parentFolderContent = response;
        } else {
          parentFolderContent = await shareService.getSharedFolderContent(
            currentFolderId,
            'files',
            isDeepFolder ? (ownerUserAuthenticationData?.token ?? '') : '',
            page,
            offset,
          );
        }

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

    let ownerUserAuthenticationDataForWorkspaces: any = null;
    if (workspaceId) {
      ownerUserAuthenticationDataForWorkspaces = {
        bridgeUser: workspaceCredentials?.credentials.networkUser,
        bridgePass: workspaceCredentials?.credentials.networkPass,
        encryptionKey: selectedWorkspace?.workspaceUser?.key,
        bucketId: workspaceCredentials?.bucket,
        workspaceId: workspaceId,
        workspacesToken: workspaceCredentials?.tokenHeader,
        resourcesToken: ownerUserAuthenticationData?.token,
      };
    }
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
          ownerUserAuthenticationData: ownerUserAuthenticationDataForWorkspaces ?? ownerUserAuthenticationData,
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
      if (memberId) dispatch(planThunks.fetchBusinessLimitUsageThunk());
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
  async (
    { files, parentFolderId, options: payloadOptions, filesProgress, onFileUploadCallback }: UploadItemsPayload,
    { getState, dispatch },
  ) => {
    const state = getState();
    const user = state.user.user as UserSettings;
    const workspaceCredentials = workspacesSelectors.getWorkspaceCredentials(state);
    const selectedWorkspace = workspacesSelectors.getSelectedWorkspace(state);
    const errors: Error[] = [];
    const abortController = payloadOptions?.abortController ?? new AbortController();

    const options = { ...DEFAULT_OPTIONS, ...payloadOptions };

    // TODO: REMOVE ANY AND ADD TYPE
    let ownerUserAuthenticationData: any = null;
    const workspaceId = selectedWorkspace?.workspace?.id;
    if (workspaceId) {
      ownerUserAuthenticationData = {
        bridgeUser: workspaceCredentials?.credentials.networkUser,
        bridgePass: workspaceCredentials?.credentials.networkPass,
        encryptionKey: selectedWorkspace?.workspaceUser?.key,
        bucketId: workspaceCredentials?.bucket,
        workspaceId: workspaceId,
        workspacesToken: workspaceCredentials?.tokenHeader,
      };
    }
    const { filesToUpload, zeroLengthFilesNumber } = await prepareFilesToUpload({
      files,
      parentFolderId,
      disableDuplicatedNamesCheck: options.disableDuplicatedNamesCheck,
      disableExistenceCheck: options.disableExistenceCheck,
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
        {
          ...options,
          ownerUserAuthenticationData: ownerUserAuthenticationData ?? undefined,
          sharedItemData: {
            isDeepFolder: false,
            currentFolderId: parentFolderId,
          },
        },
        filesProgress,
        onFileUploadCallback,
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
