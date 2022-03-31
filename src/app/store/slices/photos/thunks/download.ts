import { Photo } from '@internxt/sdk/dist/photos';
import { createAsyncThunk } from '@reduxjs/toolkit';

import { RootState } from '../../..';
import errorService from '../../../../core/services/error.service';
import downloadFileFromBlob from '../../../../drive/services/download.service/downloadFileFromBlob';
import { getPhotoBlob } from '../../../../drive/services/network.service/download';
import tasksService from '../../../../tasks/services/tasks.service';
import { DownloadPhotosTask, TaskStatus, TaskType } from '../../../../tasks/types';

export const downloadThunk = createAsyncThunk<void, Photo[], { state: RootState }>(
  'photos/delete',
  async (payload: Photo[], { dispatch, getState }) => {
    const state = getState();
    const { bucketId } = state.photos;
    if (!bucketId) return;

    const abortController = new AbortController();

    const taskId = tasksService.create({
      action: TaskType.DownloadPhotos,
      cancellable: true,
      showNotification: true,
      numberOfPhotos: payload.length,
      stop: () => abortController.abort(),
    } as DownloadPhotosTask);

    if (payload.length === 1) {
      try {
        const photo = payload[0];
        const [promise, actionState] = await getPhotoBlob({ photo, bucketId });
        if (actionState) {
          abortController.signal.addEventListener('abort', () => actionState.stop());
        }
        const src = await promise;
        if (!abortController.signal.aborted) {
          await downloadFileFromBlob(src, `${photo.name}.${photo.type}`);
          tasksService.updateTask({ taskId, merge: { status: TaskStatus.Success } });
        }
      } catch (err) {
        const error = errorService.castError(err);
        if (error.message === 'Download aborted')
          tasksService.updateTask({ taskId, merge: { status: TaskStatus.Cancelled } });
        else {
          console.error(error);
          tasksService.updateTask({ taskId, merge: { status: TaskStatus.Error } });
        }
      }
    }
  },
);
