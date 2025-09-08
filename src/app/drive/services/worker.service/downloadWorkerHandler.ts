import streamSaver from 'streamsaver';
import { DriveFileData } from 'app/drive/types';
import { createDownloadWebWorker } from '../../../../WebWorker';
import { MessageData } from './types/download';
import { downloadFileAsBlob } from '../download.service/downloadFileAsBlob';

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
  constructor() {}

  public static getWorker() {
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

    return [
      new Promise((resolve, reject) => {
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
      }),
      {
        abort: () => {
          worker.postMessage({ type: 'upload', abort: true });
        },
      },
    ];
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

    if (abortController?.signal.aborted) {
      await writer.close();
      worker.terminate();
      return;
    }

    switch (result) {
      case 'chunk': {
        const { chunk } = messageData;
        console.log('[MAIN_THREAD]: Received chunk from worker to download file');
        await writer.write(chunk);
        break;
      }

      case 'blob': {
        console.log('[MAIN_THREAD]: Downloading file as blob');
        const { readableStream, fileId } = messageData;
        await downloadFileAsBlob(completeFilename, readableStream);
        resolve(fileId);
        worker.terminate();
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
        await writer.close();
        reject(error);
        worker.terminate();
        break;
      }

      case 'abort': {
        const { error } = messageData;
        await writer.close();
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
