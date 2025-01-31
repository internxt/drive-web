import { TaskStatus, TaskType, UploadFolderTask } from '../../../../tasks/types';
import { DriveFolderData, DriveItemData } from '../../../../drive/types';
import { IRoot } from '../types';
import tasksService from '../../../../tasks/services/tasks.service';
import errorService from '../../../../core/services/error.service';
import { planThunks } from '../../plan';
import { queue, QueueObject } from 'async';
import { t } from 'i18next';
import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { RootState } from '../../../../store';
import { deleteItemsThunk } from '../storage.thunks/deleteItemsThunk';
import { SdkFactory } from './../../../../core/factory/sdk';
import { uploadItemsParallelThunk } from '../storage.thunks/uploadItemsThunk';
import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { createFolder } from './createFolder';

const MAX_CONCURRENT_UPLOADS = 6;

interface UploadFolderThunkPayload {
  root: IRoot;
  currentFolderId: string;
  options?: {
    taskId?: string;
    withNotification?: boolean;
    onSuccess?: () => void;
  };
}

const generateTaskIdForFolders = (foldersPayload: UploadFolderThunkPayload[]) => {
  return foldersPayload.map(({ root, currentFolderId, options: payloadOptions }) => {
    const options = { withNotification: true, ...payloadOptions };

    const uploadFolderAbortController = new AbortController();

    let taskId = options?.taskId;

    if (taskId) {
      tasksService.updateTask({
        taskId,
        merge: {
          status: TaskStatus.InProcess,
          progress: 0,
        },
      });
    } else {
      taskId = tasksService.create<UploadFolderTask>({
        action: TaskType.UploadFolder,
        folderName: root.name,
        item: root,
        parentFolderId: currentFolderId,
        showNotification: !!options.withNotification,
        cancellable: true,
      });
    }

    return { root, currentFolderId, options: payloadOptions, taskId, abortController: uploadFolderAbortController };
  });
};

const stopUploadTask = async (
  uploadFolderAbortController: AbortController,
  dispatch: ThunkDispatch<RootState, unknown, AnyAction>,
  relatedTaskId?: string,
  rootFolderItem?: DriveFolderData,
) => {
  uploadFolderAbortController.abort();
  const relatedTasks = tasksService.getTasks({ relatedTaskId });
  const promises: Promise<void>[] = [];

  // Cancels related tasks
  promises.push(
    ...(relatedTasks.map((task) => task.stop?.()).filter((promise) => promise !== undefined) as Promise<void>[]),
  );
  // Deletes the root folder
  if (rootFolderItem) {
    promises.push(dispatch(deleteItemsThunk([rootFolderItem as DriveItemData])).unwrap());
    const storageClient = SdkFactory.getInstance().createStorageClient();
    promises.push(storageClient.deleteFolder(rootFolderItem.id) as Promise<void>);
  }
  await Promise.all(promises);
};

function countItemsUnderRoot(root: IRoot): number {
  let count = 0;

  const queueOfFolders: Array<IRoot> = [root];

  while (queueOfFolders.length > 0) {
    const folder = queueOfFolders.shift() as IRoot;

    count += folder.childrenFiles.length;

    if (folder.childrenFolders) {
      count += folder.childrenFolders.length;
      queueOfFolders.push(...folder.childrenFolders);
    }
  }

  return count;
}

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const uploadMultipleFolder = async (
  payload: UploadFolderThunkPayload[],
  selectedWorkspace: WorkspaceData | null,
  { dispatch }: { dispatch: ThunkDispatch<RootState, unknown, AnyAction> },
) => {
  const payloadWithTaskId = generateTaskIdForFolders(payload);

  const memberId = selectedWorkspace?.workspaceUser?.memberId;

  for (const { root, currentFolderId, options: payloadOptions, taskId, abortController } of payloadWithTaskId) {
    const options = { withNotification: true, ...payloadOptions };

    let alreadyUploaded = 0;

    let rootFolderItem: DriveFolderData | undefined;
    const itemsUnderRoot = countItemsUnderRoot(root);
    const uploadFolderAbortController = abortController;

    const uploadFolderAsync = async (level: IRoot) => {
      if (uploadFolderAbortController.signal.aborted) return;

      const createdFolder = await createFolder(
        {
          parentFolderId: level.folderId as string,
          folderName: level.name,
          options: { relatedTaskId: taskId, showErrors: false },
        },
        currentFolderId,
        selectedWorkspace,
        { dispatch },
      );

      if (!rootFolderItem) {
        rootFolderItem = createdFolder;
      }

      tasksService.updateTask({
        taskId,
        merge: {
          stop: () => stopUploadTask(uploadFolderAbortController, dispatch, taskId, rootFolderItem),
        },
      });

      if (level.childrenFiles.length > 0 || level.childrenFolders.length > 0) {
        // Added wait in order to allow enough time for the server to create the folder
        await wait(500);
      }

      if (level.childrenFiles.length > 0) {
        if (uploadFolderAbortController.signal.aborted) return;
        await dispatch(
          uploadItemsParallelThunk({
            files: level.childrenFiles,
            parentFolderId: createdFolder.uuid,
            options: {
              relatedTaskId: taskId,
              showNotifications: false,
              showErrors: false,
              abortController: uploadFolderAbortController,
              disableDuplicatedNamesCheck: true,
            },
            filesProgress: { filesUploaded: alreadyUploaded, totalFilesToUpload: itemsUnderRoot },
          }),
        )
          .unwrap()
          .then(() => {
            alreadyUploaded += level.childrenFiles.length + 1;
          });
      }

      for (const child of level.childrenFolders) {
        if (uploadFolderAbortController.signal.aborted) return;
        await uploadFolderQueue.pushAsync({ ...child, folderId: createdFolder.uuid });
      }
    };

    const uploadFolderQueue: QueueObject<IRoot> = queue<IRoot>((task, callback) => {
      uploadFolderAsync(task)
        .then(() => {
          callback();
        })
        .catch((e) => {
          callback(e);
        });
    }, MAX_CONCURRENT_UPLOADS);

    try {
      root.folderId = currentFolderId;
      await uploadFolderQueue.pushAsync(root);

      while (uploadFolderQueue.running() > 0 || uploadFolderQueue.length() > 0) {
        await uploadFolderQueue.drain();
      }

      tasksService.updateTask({
        taskId: taskId,
        merge: {
          itemUUID: { rootFolderUUID: rootFolderItem?.uuid },
          status: TaskStatus.Success,
        },
      });

      options.onSuccess?.();

      setTimeout(() => {
        dispatch(planThunks.fetchUsageThunk());
        if (memberId) dispatch(planThunks.fetchBusinessLimitUsageThunk());
      }, 1000);
    } catch (err: unknown) {
      const castedError = errorService.castError(err);
      const updatedTask = tasksService.findTask(taskId);

      if (updatedTask?.status !== TaskStatus.Cancelled && taskId === updatedTask?.id) {
        tasksService.updateTask({
          taskId: taskId,
          merge: {
            status: TaskStatus.Error,
            subtitle: t('tasks.subtitles.upload-failed') as string,
          },
        });
        // Log the error or report it but don't re-throw it to allow the next folder to be processed
        errorService.reportError(castedError);
        continue;
      }
    }
  }
};
