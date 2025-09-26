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
  completeFilename: string;
  abortController?: AbortController;
  downloadCallback: (progress: number) => void;
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}

export class DownloadWorkerHandler {
  private currentWriter: WritableStreamDefaultWriter | undefined;
  private currentFileStream: WritableStream<Uint8Array<ArrayBufferLike>> | undefined;
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

    return new Promise((resolve, reject) => {
      worker.addEventListener('error', reject);
      worker.addEventListener('message', async (msg) => {
        await this.handleMessages({
          messageData: msg.data,
          worker,
          abortController,
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
        if (this.currentWriter) {
          this.currentWriter.abort();
        }
        aborted = true;
      } catch {
        // NO OP
      } finally {
        worker.terminate();
        reject(new DownloadAbortedByUserError());
      }
    };

    const removeAbortListener = () => {
      if (abortController) {
        abortController.signal.removeEventListener('abort', abortWriter);
      }
    };

    if (abortController) {
      abortController.signal.addEventListener('abort', abortWriter, { once: true });
    }

    switch (result) {
      case 'chunk': {
        if (!this.currentWriter) {
          this.currentFileStream = streamSaver.createWriteStream(completeFilename);
          this.currentWriter = this.currentFileStream.getWriter();
        }

        const { chunk } = messageData;
        await this.currentWriter.write(chunk);
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
        if (this.currentWriter) {
          await this.currentWriter.close();
        }
        worker.terminate();
        removeAbortListener();
        resolve(fileId);
        break;
      }

      case 'error': {
        const { error } = messageData;
        worker.terminate();
        removeAbortListener();
        reject(error);
        break;
      }

      case 'abort': {
        worker.terminate();
        removeAbortListener();
        reject(new DownloadAbortedByUserError());
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

export class DownloadAbortedByUserError extends Error {
  public constructor() {
    super('Download aborted by user');
  }
}

export const downloadWorkerHandler = new DownloadWorkerHandler();
