import { PhotoId } from '@internxt/sdk/dist/photos';
import { createAsyncThunk } from '@reduxjs/toolkit';

import { RootState } from '../../..';
import errorService from '../../../../core/services/error.service';
import downloadFileFromBlob from '../../../../drive/services/download.service/downloadFileFromBlob';
import tasksService from '../../../../tasks/services/tasks.service';
import { DownloadPhotosTask, TaskStatus, TaskType } from '../../../../tasks/types';
import JSZip from 'jszip';
import { Readable } from 'stream';
import i18n from '../../../../i18n/services/i18n.service';
import streamSaver from 'streamsaver';
import { ActionState } from '@internxt/inxt-js/build/api';
import { SerializablePhoto } from '..';
import { getPhotoBlob, getPhotoCachedOrStream } from 'app/network/download';

export const downloadThunk = createAsyncThunk<void, SerializablePhoto[], { state: RootState }>(
  'photos/delete',
  async (payload: SerializablePhoto[], { getState }) => {
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

    try {
      if (payload.length === 1) {
        const photo = payload[0];
        const [promise, actionState] = await getPhotoBlob({ photo, bucketId });
        if (actionState) {
          abortController.signal.addEventListener('abort', () => actionState.stop());
        }
        const src = await promise;
        if (!abortController.signal.aborted) {
          await downloadFileFromBlob(src, `${photo.name}.${photo.type}`);
        }
      } else {
        const zip = new JSZip();
        const isBrave = !!(navigator.brave && (await navigator.brave.isBrave()));

        if (isBrave) {
          throw new Error(i18n.get('error.browserNotSupported', { userAgent: 'Brave' }));
        }

        const writableStream = streamSaver.createWriteStream('photos.zip', {});
        const writer = writableStream.getWriter();
        const onUnload = () => {
          writer.abort();
        };
        abortController.signal.addEventListener('abort', onUnload);

        const actionStates: ActionState[] = [];

        abortController.signal.addEventListener('abort', () => {
          actionStates.forEach((actionState) => actionState.stop());
        });

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
          });
          if (photoSource instanceof Blob) {
            zip.file(photoName, photoSource, { compression: 'DEFLATE' });
          } else {
            const [readable, abortable] = photoSource;
            actionStates.push(abortable);
            zip.file(photoName, await readable, { compression: 'DEFLATE' });
          }
        }
        if (abortController.signal.aborted) {
          new Error('Download aborted');
        }
        await new Promise<void>((resolve, reject) => {
          window.addEventListener('unload', onUnload);
          abortController.signal.addEventListener('abort', () => reject(new Error('Download aborted')));

          const zipStream = zip.generateInternalStream({
            type: 'uint8array',
            streamFiles: true,
            compression: 'DEFLATE',
          }) as Readable;
          zipStream
            ?.on('data', (chunk: Buffer) => {
              writer.write(chunk);
            })
            .on('end', () => {
              writer.close();
              window.removeEventListener('unload', onUnload);
              resolve();
            })
            .on('error', (err) => {
              reject(err);
            });
          zipStream.resume();
        });
      }
      tasksService.updateTask({ taskId, merge: { status: TaskStatus.Success } });
    } catch (err) {
      const error = errorService.castError(err);
      if (error.message === 'Download aborted')
        tasksService.updateTask({ taskId, merge: { status: TaskStatus.Cancelled } });
      else {
        console.error(error);
        tasksService.updateTask({ taskId, merge: { status: TaskStatus.Error } });
      }
    }
  },
);
