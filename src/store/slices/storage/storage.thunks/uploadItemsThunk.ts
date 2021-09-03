import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { items as itemUtils } from '@internxt/lib';

import i18n from '../../../../services/i18n.service';
import folderService from '../../../../services/folder.service';
import { renameFile } from '../../../../lib/utils';
import storageService from '../../../../services/storage.service';
import { DriveFileData, DriveItemData, UserSettings } from '../../../../models/interfaces';
import { taskManagerActions, taskManagerSelectors } from '../../task-manager';
import { storageActions, storageSelectors } from '..';
import { ItemToUpload } from '../../../../services/storage.service/storage-upload.service';
import { StorageState } from '../storage.model';
import { MAX_ALLOWED_UPLOAD_SIZE } from '../../../../lib/constants';
import { sessionSelectors } from '../../session/session.selectors';
import notificationsService, { ToastType } from '../../../../services/notifications.service';
import { RootState } from '../../..';
import errorService from '../../../../services/error.service';
import { TaskProgress, TaskStatus, TaskType, UploadFileTask } from '../../../../services/task-manager.service';

interface UploadItemsThunkOptions {
  relatedTaskId: string;
  showNotifications: boolean;
  showErrors: boolean;
  onSuccess: () => void;
}

interface UploadItemsPayload {
  files: File[];
  parentFolderId: number;
  folderPath: string;
  options?: Partial<UploadItemsThunkOptions>;
}

/**
 * @description
 *  1. Prepare files to upload
 *  2. Schedule tasks
 */
export const uploadItemsThunk = createAsyncThunk<void, UploadItemsPayload, { state: RootState }>(
  'storage/uploadItems',
  async ({ files, parentFolderId, folderPath, options }: UploadItemsPayload, { getState, dispatch, requestId }) => {
    const user = getState().user.user as UserSettings;
    const { namePath } = getState().storage;

    const showSizeWarning = files.some((file) => file.size >= MAX_ALLOWED_UPLOAD_SIZE);
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const relativePath = namePath
      .map((pathLevel) => pathLevel.name)
      .slice(1)
      .join('/');
    const filesToUpload: ItemToUpload[] = [];
    const errors: Error[] = [];
    const tasksIds: string[] = [];

    options = Object.assign({ showNotifications: true, showErrors: true }, options || {});

    if (showSizeWarning) {
      notificationsService.show(
        'File too large.\nYou can only upload or download files of up to 1GB through the web app',
        ToastType.Warning,
      );
      return;
    }

    for (const [index, file] of files.entries()) {
      const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
      const [parentFolderContentPromise, cancelTokenSource] = folderService.fetchFolderContent(parentFolderId);
      const taskId = `${requestId}-${index}`;
      const task: UploadFileTask = {
        id: taskId,
        relatedTaskId: options?.relatedTaskId,
        action: TaskType.UploadFile,
        status: TaskStatus.Pending,
        progress: TaskProgress.Min,
        fileName: filename,
        fileType: extension,
        isFileNameValidated: false,
        showNotification: !!options?.showNotifications,
        cancellable: true,
        stop: async () => cancelTokenSource.cancel(),
      };

      dispatch(taskManagerActions.addTask(task));

      const parentFolderContent = await parentFolderContentPromise;
      const [, , finalFilename] = itemUtils.renameIfNeeded(parentFolderContent.files, filename, extension);
      const fileContent = renameFile(file, finalFilename);

      dispatch(
        taskManagerActions.updateTask({
          taskId,
          merge: {
            fileName: finalFilename,
            isFileNameValidated: true,
          },
        }),
      );

      filesToUpload.push({
        name: finalFilename,
        size: file.size,
        type: extension,
        content: fileContent,
        parentFolderId,
        folderPath,
      });

      tasksIds.push(task.id);
    }

    // 2.
    for (const [index, file] of filesToUpload.entries()) {
      const type = file.type === undefined ? null : file.type;
      const path = relativePath + '/' + file.name + '.' + type;
      const taskId = tasksIds[index];
      const updateProgressCallback = (progress) => {
        const task = taskManagerSelectors.findTaskById(getState())(taskId);

        if (task?.status !== TaskStatus.Cancelled) {
          dispatch(
            taskManagerActions.updateTask({
              taskId: taskId,
              merge: {
                status: TaskStatus.InProcess,
                progress,
              },
            }),
          );
        }
      };
      const taskFn = async (): Promise<DriveFileData> => {
        const task = taskManagerSelectors.findTaskById(getState())(taskId);
        const [uploadFilePromise, actionState] = storageService.upload.uploadFile(
          user.email,
          file,
          path,
          isTeam,
          updateProgressCallback,
        );

        dispatch(
          taskManagerActions.updateTask({
            taskId,
            merge: {
              status: TaskStatus.Encrypting,
              stop: async () => {
                task?.stop?.();
                actionState?.stop();
              },
            },
          }),
        );

        const uploadedFile = await uploadFilePromise;

        uploadedFile.name = file.name;

        return uploadedFile;
      };

      file.parentFolderId = parentFolderId;

      await taskFn()
        .then((uploadedFile) => {
          if (uploadedFile.folderId === storageSelectors.currentFolderId(getState())) {
            dispatch(storageActions.pushItems({ items: uploadedFile as DriveItemData }));
          }

          dispatch(
            taskManagerActions.updateTask({
              taskId: taskId,
              merge: { status: TaskStatus.Success },
            }),
          );
        })
        .catch((err: unknown) => {
          const castedError = errorService.castError(err);
          const task = taskManagerSelectors.findTaskById(getState())(tasksIds[index]);

          if (task?.status !== TaskStatus.Cancelled) {
            dispatch(
              taskManagerActions.updateTask({
                taskId: taskId,
                merge: { status: TaskStatus.Error },
              }),
            );

            errors.push(castedError);
          }
        });
    }

    options.onSuccess?.();

    if (errors.length > 0) {
      throw new Error(i18n.get('error.uploadingItems'));
    }
  },
);

export const uploadItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(uploadItemsThunk.pending, () => undefined)
    .addCase(uploadItemsThunk.fulfilled, () => undefined)
    .addCase(uploadItemsThunk.rejected, (state, action) => {
      const requestOptions = action.meta.arg.options;

      if (requestOptions?.showErrors) {
        notificationsService.show(
          i18n.get('error.uploadingFile', { reason: action.error.message || '' }),
          ToastType.Error,
        );
      }
    });
};
