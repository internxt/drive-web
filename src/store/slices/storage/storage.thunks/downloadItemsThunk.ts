import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { DriveItemData } from '../../../../models/interfaces';
import downloadService from '../../../../services/download.service';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';
import { taskManagerActions, taskManagerSelectors } from '../../task-manager';
import { sessionSelectors } from '../../session/session.selectors';
import errorService from '../../../../services/error.service';
import { DownloadFileTask, TaskStatus, TaskType } from '../../../../services/task-manager.service';

export const downloadItemsThunk = createAsyncThunk<void, DriveItemData[], { state: RootState }>(
  'storage/downloadItems',
  async (items: DriveItemData[], { getState, dispatch, requestId, rejectWithValue }) => {
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const tasksIds: string[] = [];
    const promises: Promise<void>[] = [];
    const errors: unknown[] = [];

    items.forEach((item, i) => {
      const taskId = `${requestId}-${i}`;
      const task: DownloadFileTask = {
        id: taskId,
        action: TaskType.DownloadFile,
        status: TaskStatus.Pending,
        file: item,
        progress: 0,
        showNotification: true,
        cancellable: true,
      };

      tasksIds.push(taskId);
      dispatch(taskManagerActions.addTask(task));
    });

    for (const [index, item] of items.entries()) {
      const taskId = tasksIds[index];
      const updateProgressCallback = (progress: number) => {
        const task = taskManagerSelectors.findTaskById(getState())(taskId);

        if (task?.status !== TaskStatus.Cancelled) {
          dispatch(
            taskManagerActions.updateTask({
              taskId: tasksIds[index],
              merge: {
                status: TaskStatus.InProcess,
                progress,
              },
            }),
          );
        }
      };
      const [downloadPromise, actionState] = downloadService.downloadFile(item, isTeam, updateProgressCallback);

      dispatch(
        taskManagerActions.updateTask({
          taskId,
          merge: {
            status: TaskStatus.Decrypting,
            stop: async () => actionState?.stop(),
          },
        }),
      );

      downloadPromise
        .then(() => {
          dispatch(
            taskManagerActions.updateTask({
              taskId,
              merge: {
                status: TaskStatus.Success,
              },
            }),
          );
        })
        .catch((err: unknown) => {
          const castedError = errorService.castError(err);
          const task = taskManagerSelectors.findTaskById(getState())(tasksIds[index]);

          if (task?.status !== TaskStatus.Cancelled) {
            dispatch(
              taskManagerActions.updateTask({
                taskId,
                merge: {
                  status: TaskStatus.Error,
                },
              }),
            );

            errors.push({ ...castedError });
          }
        });

      promises.push(downloadPromise);
    }

    await Promise.allSettled(promises);

    if (errors.length > 0) {
      return rejectWithValue(errors);
    }
  },
);

export const downloadItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(downloadItemsThunk.pending, () => undefined)
    .addCase(downloadItemsThunk.fulfilled, () => undefined)
    .addCase(downloadItemsThunk.rejected, (state, action) => {
      const errors = action.payload as unknown[];

      if (errors && errors.length > 0) {
        notificationsService.show(i18n.get('error.downloadingItems'), ToastType.Error);
      } else {
        notificationsService.show(
          i18n.get('error.downloadingFile', { reason: action.error.message || '' }),
          ToastType.Error,
        );
      }
    });
};
