import streamSaver from 'streamsaver';
import { DriveFileData } from 'app/drive/types';
import { MessageData } from './types/download';
import { createDownloadWebWorker } from '../../../../WebWorker';
import downloadFileFromBlob from '../download.service/downloadFileFromBlob';

interface HandleWorkerMessagesPayload {
  worker: Worker;
  abortController?: AbortController;
  itemData: DriveFileData;
  updateProgressCallback: (progress: number) => void;
}

interface HandleMessagesPayload {
  messageData: MessageData;
  worker: Worker;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  completeFilename: string;
  abortController?: AbortController;
  downloadCallback: (progress: number) => void;
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}

export class DownloadWorkerHandler {
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
    const fileStream = streamSaver.createWriteStream(completeFilename);
    const writer = fileStream.getWriter();

    return new Promise((resolve, reject) => {
      worker.addEventListener('error', reject);
      worker.addEventListener('message', async (msg) => {
        console.log('[DOWNLOAD/MAIN_THREAD]: Message received from worker', msg);
        await this.handleMessages({
          messageData: msg.data,
          worker,
          abortController,
          writer,
          completeFilename,
          downloadCallback: updateProgressCallback,
          resolve,
          reject,
        });
      });
    });
  }

  public async handleMessages({
    messageData,
    worker,
    writer,
    completeFilename,
    abortController,
    resolve,
    reject,
    downloadCallback,
  }: HandleMessagesPayload) {
    const { result } = messageData;
    let aborted = false;

    const abortWriter = async () => {
      if (aborted) return;

      try {
        worker.postMessage({ type: 'abort' });
        await writer.abort();
        aborted = true;
      } catch {
        // NO OP
      } finally {
        worker.terminate();
        reject('Aborted');
      }
    };

    if (abortController) {
      abortController.signal.addEventListener('abort', abortWriter, { once: true });
    }

    switch (result) {
      case 'chunk': {
        const { chunk } = messageData;

        console.log('[MAIN_THREAD]: Received chunk from worker to download file');
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
        await writer.close();
        worker.terminate();
        if (abortController) {
          abortController.signal.removeEventListener('abort', abortWriter);
        }
        resolve(fileId);
        break;
      }

      case 'error': {
        const { error } = messageData;
        await writer.abort();
        worker.terminate();
        if (abortController) {
          abortController.signal.removeEventListener('abort', abortWriter);
        }
        reject(error);
        break;
      }

      case 'abort': {
        worker.terminate();
        if (abortController) {
          abortController.signal.removeEventListener('abort', abortWriter);
        }
        reject('Aborted');
        break;
      }

      default:
        console.warn('[MAIN_THREAD]: Received unknown message from worker');
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
