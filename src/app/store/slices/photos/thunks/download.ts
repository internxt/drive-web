import { PhotoId } from '@internxt/sdk/dist/photos';
import { createAsyncThunk } from '@reduxjs/toolkit';

import { RootState } from '../../..';
import errorService from '../../../../core/services/error.service';
import downloadFileFromBlob from '../../../../drive/services/download.service/downloadFileFromBlob';
import tasksService from '../../../../tasks/services/tasks.service';
import { DownloadPhotosTask, TaskStatus, TaskType } from '../../../../tasks/types';
import { SerializablePhoto } from '..';
import { getPhotoBlob, getPhotoCachedOrStream } from 'app/network/download';
import { FlatFolderZip } from 'app/core/services/stream.service';
import { t } from 'i18next';

export const downloadThunk = createAsyncThunk<void, SerializablePhoto[], { state: RootState }>(
  'photos/delete',
  async (payload: SerializablePhoto[], { getState }) => {
    const state = getState();
    const { bucketId } = state.photos;
    if (!bucketId) return;

    const abortController = new AbortController();

    let taskId = '';

    try {
      taskId = tasksService.create({
        action: TaskType.DownloadPhotos,
        cancellable: true,
        showNotification: true,
        numberOfPhotos: payload.length,
        stop: () => (abortController as { abort: (reason?: string) => void }).abort('Download cancelled'),
      } as DownloadPhotosTask);

      if (payload.length === 1) {
        const [photo] = payload;

        const photoBlob = await getPhotoBlob({ photo, bucketId, abortController });

        if (!abortController.signal.aborted) {
          await downloadFileFromBlob(photoBlob, `${photo.name}.${photo.type}`);
        }
      } else {
        const isBrave = !!(navigator.brave && (await navigator.brave.isBrave()));

        if (isBrave) {
          throw new Error(t('error.browserNotSupported', { userAgent: 'Brave' }) as string);
        }

        const folder = new FlatFolderZip('photos', { abortController });
        const generalProgress: Record<PhotoId, number> = {};

        const updateTaskProgress = () => {
          const totalSize = payload.reduce((prev, current) => prev + current.size, 0);
          const currentSize = payload.reduce(
            (prev, current) => prev + current.size * (generalProgress[current.id] ?? 0),
            0,
          );

          tasksService.updateTask({ taskId, merge: { progress: currentSize / totalSize } });
        };

        for (const photo of payload) {
          if (abortController.signal.aborted) break;

          const photoName = `${photo.name}.${photo.type}`;
          const photoSource = await getPhotoCachedOrStream({
            photo,
            bucketId,
            onProgress: (progress) => {
              generalProgress[photo.id] = progress;
              updateTaskProgress();
            },
            abortController,
          });

          if (photoSource instanceof Blob) {
            folder.addFile(photoName, photoSource.stream());
          } else {
            folder.addFile(photoName, await photoSource);
          }
        }
        if (abortController.signal.aborted) {
          throw new Error('Download aborted');
        }

        await folder.close();
      }
      tasksService.updateTask({ taskId, merge: { status: TaskStatus.Success } });
    } catch (err) {
      const error = errorService.castError(err);

      if (abortController.signal.aborted) tasksService.updateTask({ taskId, merge: { status: TaskStatus.Cancelled } });
      else {
        console.error(error);
        tasksService.updateTask({ taskId, merge: { status: TaskStatus.Error } });
      }
    }
  },
);
