import { DriveFolderData, DriveItemData } from '../../../../drive/types';
import tasksService from '../../../../tasks/services/tasks.service';
import { CreateFolderTask, TaskProgress, TaskStatus, TaskType } from '../../../../tasks/types';
import workspacesService from '../../../../core/services/workspace.service';
import folderService from '../../../../drive/services/folder.service';
import { storageActions } from '..';
import errorService from '../../../../core/services/error.service';
import { CreateFolderResponse } from '@internxt/sdk/dist/drive/storage/types';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';
import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { RootState } from '../../../../store';
import { WorkspaceData } from '@internxt/sdk/dist/workspaces';

interface CreateFolderOptions {
  relatedTaskId: string;
  showErrors: boolean;
}

interface CreateFolderPayload {
  parentFolderId: string;
  folderName: string;
  options?: Partial<CreateFolderOptions>;
  uuid?: string;
}

export const createFolder = async (
  { folderName, parentFolderId, options }: CreateFolderPayload,
  currentFolderId: string,
  selectedWorkspace: WorkspaceData | null,
  { dispatch }: { dispatch: ThunkDispatch<RootState, unknown, AnyAction> },
): Promise<DriveFolderData> => {
  options = Object.assign({ showErrors: true }, options || {});
  const workspaceId = selectedWorkspace?.workspace?.id;
  let createdFolderPromise: Promise<CreateFolderResponse>;
  let requestCanceler: RequestCanceler;

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
      plain_name: createdFolder.plainName,
      deleted: false,
      createdAt: new Date(createdFolder.createdAt || '').toISOString(),
      updatedAt: new Date(createdFolder.updatedAt || '').toISOString(),
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
};
