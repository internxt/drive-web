import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { t } from 'i18next';
import { storageActions, storageSelectors } from '..';
import { RootState } from '../../..';
import errorService from '../../../../core/services/error.service';
import workspacesService from '../../../../core/services/workspace.service';
import folderService from '../../../../drive/services/folder.service';
import { DriveFolderData, DriveItemData } from '../../../../drive/types';
import tasksService from '../../../../tasks/services/tasks.service';
import { CreateFolderTask, TaskProgress, TaskStatus, TaskType } from '../../../../tasks/types';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { StorageState } from '../storage.model';

interface CreateFolderThunkOptions {
  relatedTaskId: string;
  showErrors: boolean;
}

interface CreateFolderPayload {
  parentFolderId: string;
  folderName: string;
  options?: Partial<CreateFolderThunkOptions>;
  uuid?: string;
}

export const createFolderThunk = createAsyncThunk<DriveFolderData, CreateFolderPayload, { state: RootState }>(
  'storage/createFolder',
  async ({ folderName, parentFolderId, options }: CreateFolderPayload, { getState, dispatch }) => {
    options = Object.assign({ showErrors: true }, options || {});
    const currentFolderId = storageSelectors.currentFolderId(getState());
    const selectedWorkspace = workspacesSelectors.getSelectedWorkspace(getState());
    const workspaceId = selectedWorkspace?.workspace?.id;
    let createdFolderPromise, requestCanceler;

    try {
      if (workspaceId) {
        [createdFolderPromise, requestCanceler] = workspacesService.createFolder({
          workspaceId,
          parentFolderUuid: parentFolderId,
          plainName: folderName,
        });
      } else {
        [createdFolderPromise, requestCanceler] = folderService.createFolderByUuid(parentFolderId, folderName);
      }

      const taskId = tasksService.create<CreateFolderTask>({
        relatedTaskId: options.relatedTaskId,
        action: TaskType.CreateFolder,
        folderName: folderName,
        parentFolderId: parentFolderId,
        showNotification: false,
        cancellable: false,
        stop: async () => requestCanceler.cancel(),
      });

      const createdFolder = await createdFolderPromise;
      const createdFolderNormalized: DriveFolderData = {
        ...createdFolder,
        name: folderName,
        parent_id: createdFolder.parentId,
        user_id: createdFolder.userId,
        icon: null,
        iconId: null,
        icon_id: null,
        isFolder: true,
        color: null,
        encrypt_version: null,
        plain_name: createdFolder.plain_name,
        deleted: false,
      };

      tasksService.updateTask({
        taskId: taskId,
        merge: {
          status: TaskStatus.Success,
          progress: TaskProgress.Max,
        },
      });

      if (currentFolderId === parentFolderId) {
        dispatch(
          storageActions.pushItems({
            folderIds: [currentFolderId],
            items: createdFolderNormalized as DriveItemData,
          }),
        );
      }

      return createdFolderNormalized;
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      throw castedError;
    }
  },
);

export const createFolderThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(createFolderThunk.pending, () => undefined)
    .addCase(createFolderThunk.fulfilled, () => undefined)
    .addCase(createFolderThunk.rejected, (state, action) => {
      const requestOptions = Object.assign({ showErrors: true }, action.meta.arg.options || {});

      if (requestOptions?.showErrors) {
        let errorMessage: string;

        if (action.error.message?.includes('already exists')) {
          errorMessage = t('error.folderAlreadyExists');
        } else if (action.error.message?.includes('Invalid folder name')) {
          errorMessage = t('error.folderInvalidName');
        } else {
          errorMessage = t('error.creatingFolder');
        }

        notificationsService.show({ text: errorMessage, type: ToastType.Error });
      }
    });
};
