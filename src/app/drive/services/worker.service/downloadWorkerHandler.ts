import streamSaver from '../../../../services/StreamSaver';
import { DriveFileData } from 'app/drive/types';
import { MessageData } from './types/download';
import { createDownloadWebWorker } from '../../../../WebWorker';
import downloadFileFromBlob from '../download.service/downloadFileFromBlob';
import errorService from 'app/core/services/error.service';
import { DownloadAbortedByUserError } from 'app/network/errors/download.errors';

interface HandleWorkerMessagesPayload {
  worker: Worker;
  abortController?: AbortController;
  itemData: DriveFileData;
  updateProgressCallback: (progress: number) => void;
}

interface HandleMessagesPayload {
  messageData: MessageData;
  worker: Worker;
  completeFilename: string;
  item: {
    fileName: string;
    size: number;
  };
  downloadCallback: (progress: number) => void;
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}

export class DownloadWorkerHandler {
  private readonly writers = new Map<string, WritableStreamDefaultWriter>();

  public getWorker() {
    return createDownloadWebWorker();
  }

  public handleWorkerMessages({
    worker,
    abortController,
    itemData,
    updateProgressCallback,
  }: HandleWorkerMessagesPayload) {
    const fileName = itemData.plainName ?? itemData.name;
    const completeFilename = itemData.type ? `${fileName}.${itemData.type}` : fileName;
    const itemSize = itemData.size;
    const downloadId = itemData.fileId;

    return new Promise((resolve, reject) => {
      let aborted = false;

      const removeAbortListener = () => {
        if (abortController) {
          abortController.signal.removeEventListener('abort', abortWriter);
        }
      };

      const abortWriter = async () => {
        if (aborted) return;
        aborted = true;

        try {
          worker.postMessage({ type: 'abort' });
          await this.downloadCleanup(worker, downloadId, true, removeAbortListener);
          console.log('[MAIN_THREAD]: Download aborted by user');
          reject(new DownloadAbortedByUserError());
        } catch (error) {
          const castedError = errorService.castError(error);
          reject(castedError);
        }
      };

      if (abortController) {
        abortController.signal.addEventListener('abort', abortWriter, { once: true });
      }

      worker.addEventListener('error', reject);
      worker.addEventListener('message', async (msg) => {
        if (aborted) {
          console.log('[MAIN_THREAD]: Ignoring message after abort:', msg.data.result);
          return;
        }

        await this.handleMessages({
          messageData: msg.data,
          worker,
          completeFilename,
          downloadCallback: updateProgressCallback,
          item: {
            fileName: completeFilename,
            size: itemSize,
          },
          downloadId,
          resolve,
          reject,
          removeAbortListener,
        });
      });
    });
  }

  async downloadCleanup(worker: Worker, downloadId: string, shouldAbort = false, removeAbortListener?: () => void) {
    const writer = this.writers.get(downloadId);
    if (writer) {
      if (shouldAbort) {
        await writer.abort();
      } else {
        await writer.close();
      }
    }

    this.writers.delete(downloadId);

    if (removeAbortListener) {
      removeAbortListener();
    }

    console.log('[MAIN_THREAD]: Download cleanup complete');
    worker.terminate();
  }

  public async handleMessages({
    messageData,
    worker,
    completeFilename,
    downloadId,
    item,
    resolve,
    reject,
    downloadCallback,
    removeAbortListener,
  }: HandleMessagesPayload & {
    downloadId: string;
    removeAbortListener: () => void;
  }) {
    const { result } = messageData;

    switch (result) {
      case 'chunk': {
        let writer = this.writers.get(downloadId);

        if (!writer) {
          const streamOptions = {
            size: item.size || null,
          };

          const fileStream = streamSaver.createWriteStream(completeFilename, streamOptions);

          writer = fileStream.getWriter();

          this.writers.set(downloadId, writer);
        }

        const { chunk } = messageData;

        await writer.write(chunk);
        break;
      }

      case 'blob': {
        console.log('[MAIN_THREAD]: Downloading complete blob');
        const { blob } = messageData;
        downloadFileFromBlob(blob, completeFilename);
        break;
      }

      case 'progress': {
        const { progress } = messageData;
        this.handleProgress({ progress, downloadCallback });
        break;
      }

      case 'success': {
        const { fileId } = messageData;
        await this.downloadCleanup(worker, downloadId, false, removeAbortListener);
        resolve(fileId);
        break;
      }

      case 'error': {
        const { error } = messageData;
        const castedError = new Error(error);
        await this.downloadCleanup(worker, downloadId, true, removeAbortListener);
        reject(castedError);
        break;
      }

      default:
        console.warn('[MAIN_THREAD]: Received unknown message from worker:', result);
        break;
    }
  }

  public handleProgress({
    progress,
    downloadCallback,
  }: {
    progress?: number;
    downloadCallback: (progress: number) => void;
  }) {
    if (progress && downloadCallback) {
      downloadCallback(progress);
    }
  }
}

export const downloadWorkerHandler = new DownloadWorkerHandler();
