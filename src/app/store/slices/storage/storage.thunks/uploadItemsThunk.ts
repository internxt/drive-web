import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { items as itemUtils } from '@internxt/lib';
import { storageActions, storageSelectors } from '..';
import { StorageState } from '../storage.model';
import { sessionSelectors } from '../../session/session.selectors';
import { RootState } from '../../..';
import { planThunks } from '../../plan';
import { uiActions } from '../../ui';
import { TaskStatus, TaskType, UploadFileTask } from 'app/tasks/types';
import tasksService from 'app/tasks/services/tasks.service';
import errorService from 'app/core/services/error.service';
import i18n from 'app/i18n/services/i18n.service';
import { renameFile } from 'app/crypto/services/utils';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { MAX_ALLOWED_UPLOAD_SIZE } from 'app/drive/services/network.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { DriveFileData, DriveItemData } from 'app/drive/types';
import { ItemToUpload } from 'app/drive/services/file.service/uploadFile';
import fileService from 'app/drive/services/file.service';
import { SdkFactory } from '../../../../core/factory/sdk';

interface UploadItemsThunkOptions {
  relatedTaskId: string;
  showNotifications: boolean;
  showErrors: boolean;
  onSuccess: () => void;
}

interface UploadItemsPayload {
  files: File[];
  parentFolderId: number;
  options?: Partial<UploadItemsThunkOptions>;
}

const DEFAULT_OPTIONS: Partial<UploadItemsThunkOptions> = { showNotifications: true, showErrors: true };

/**
 * @description
 *  1. Prepare files to upload
 *  2. Schedule tasks
 */
export const uploadItemsThunk = createAsyncThunk<void, UploadItemsPayload, { state: RootState }>(
  'storage/uploadItems',
  async ({ files, parentFolderId, options }: UploadItemsPayload, { getState, dispatch }) => {
    const user = getState().user.user as UserSettings;
    const showSizeWarning = files.some((file) => file.size >= MAX_ALLOWED_UPLOAD_SIZE);
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const filesToUpload: ItemToUpload[] = [];
    const errors: Error[] = [];
    const tasksIds: string[] = [];

    options = Object.assign(DEFAULT_OPTIONS, options || {});

    try {
      const planLimit = getState().plan.planLimit;
      const planUsage = getState().plan.planUsage;

      if (planLimit && planUsage >= planLimit) {
        dispatch(uiActions.setIsReachedPlanLimitDialogOpen(true));
        return;
      }
    } catch (err: unknown) {
      console.error(err);
    }

    if (showSizeWarning) {
      notificationsService.show(
        'File too large.\nYou can only upload or download files of up to 1GB through the web app',
        ToastType.Warning,
      );
      return;
    }

    const storageClient = SdkFactory.getInstance().createStorageClient();

    for (const file of files) {
      const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
      const [parentFolderContentPromise, requestCanceler] = storageClient.getFolderContent(parentFolderId);
      const taskId = tasksService.create<UploadFileTask>({
        relatedTaskId: options?.relatedTaskId,
        action: TaskType.UploadFile,
        fileName: filename,
        fileType: extension,
        isFileNameValidated: false,
        showNotification: !!options?.showNotifications,
        cancellable: true,
        stop: async () => requestCanceler.cancel(),
      });

      const parentFolderContent = await parentFolderContentPromise;
      const [, , finalFilename] = itemUtils.renameIfNeeded(parentFolderContent.files, filename, extension);
      const fileContent = renameFile(file, finalFilename);

      tasksService.updateTask({
        taskId,
        merge: {
          fileName: finalFilename,
          isFileNameValidated: true,
        },
      });

      filesToUpload.push({
        name: finalFilename,
        size: file.size,
        type: extension,
        content: fileContent,
        parentFolderId,
      });

      tasksIds.push(taskId);
    }

    // 2.
    for (const [index, file] of filesToUpload.entries()) {
      const taskId = tasksIds[index];
      const updateProgressCallback = (progress) => {
        const task = tasksService.findTask(taskId);

        if (task?.status !== TaskStatus.Cancelled) {
          tasksService.updateTask({
            taskId: taskId,
            merge: {
              status: TaskStatus.InProcess,
              progress,
            },
          });
        }
      };
      const taskFn = async (): Promise<DriveFileData> => {
        const task = tasksService.findTask(taskId);
        const [uploadFilePromise, actionState] = fileService.uploadFile(
          user.email,
          file,
          isTeam,
          updateProgressCallback,
        );

        tasksService.updateTask({
          taskId,
          merge: {
            status: TaskStatus.Encrypting,
            stop: async () => {
              actionState?.stop();
            },
          },
        });

        const uploadedFile = await uploadFilePromise;

        uploadedFile.name = file.name;

        return uploadedFile;
      };

      file.parentFolderId = parentFolderId;

      await taskFn()
        .then((uploadedFile) => {
          const currentFolderId = storageSelectors.currentFolderId(getState());

          if (uploadedFile.folderId === currentFolderId) {
            dispatch(
              storageActions.pushItems({
                updateRecents: true,
                folderIds: [currentFolderId],
                items: uploadedFile as DriveItemData,
              }),
            );
          }

          tasksService.updateTask({
            taskId: taskId,
            merge: { status: TaskStatus.Success },
          });
        })
        .catch((err: unknown) => {
          const castedError = errorService.castError(err);
          const task = tasksService.findTask(tasksIds[index]);

          if (task?.status !== TaskStatus.Cancelled) {
            tasksService.updateTask({
              taskId: taskId,
              merge: { status: TaskStatus.Error },
            });

            console.error(castedError);

            errors.push(castedError);
          }
        });
    }

    options.onSuccess?.();

    dispatch(planThunks.fetchUsageThunk());

    if (errors.length > 0) {
      for (const error of errors) {
        notificationsService.show(error.message, ToastType.Error);
      }

      throw new Error(i18n.get('error.uploadingItems'));
    }
  },
);

export const uploadItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(uploadItemsThunk.pending, () => undefined)
    .addCase(uploadItemsThunk.fulfilled, () => undefined)
    .addCase(uploadItemsThunk.rejected, (state, action) => {
      const requestOptions = Object.assign(DEFAULT_OPTIONS, action.meta.arg.options || {});

      if (requestOptions?.showErrors) {
        notificationsService.show(
          i18n.get('error.uploadingFile', { reason: action.error.message || '' }),
          ToastType.Error,
        );
      }
    });
};
