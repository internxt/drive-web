import streamSaver from 'streamsaver';
import { DriveFileData } from 'app/drive/types';
import { MessageData } from './types/download';
import { BlobWritable, getBlobWritable, downloadAsBlob } from '../download.service/downloadAsBlob';
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
    // Returning the donwloaded worker
    // return createDownloadWebWorker();
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

    switch (result) {
      case 'chunk': {
        const { chunk } = messageData;

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

        console.log('[MAIN_THREAD]: Received chunk from worker to download file');
        await writer.write(chunk);

        if (abortController && !abortController.signal.aborted) {
          abortController.signal.removeEventListener('abort', abortWriter);
        }
        break;
      }

      case 'blob': {
        console.log('[MAIN_THREAD]: Downloading file as blob');
        const { readableStream } = messageData;
        const blobWritable: BlobWritable = await getBlobWritable(completeFilename, (blob) => {
          downloadFileFromBlob(blob, completeFilename);
        });

        const abortBlobCallBack = async () => {
          if (abortController?.signal.aborted && !aborted) {
            worker.postMessage({ type: 'abort' });
            await blobWritable.abort();
            await readableStream.cancel();
            worker.terminate();
            aborted = true;
            reject('Aborted');
          }
        };

        if (abortController) {
          abortController.signal.addEventListener('abort', abortBlobCallBack, { once: true });
        }

        await downloadAsBlob(readableStream, blobWritable);

        if (abortController && !abortController.signal.aborted) {
          abortController.signal.removeEventListener('abort', abortBlobCallBack);
        }
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
        resolve(fileId);
        worker.terminate();
        break;
      }

      case 'error': {
        const { error } = messageData;
        await writer.abort();
        reject(error);
        worker.terminate();
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
