import { binaryStreamToBlob } from 'app/core/services/stream.service';
import createFileDownloadStream from 'app/drive/services/download.service/createFileDownloadStream';
import { DriveFileData } from 'app/drive/types';

export class DownloadWorker {
  static readonly instance: DownloadWorker = new DownloadWorker();

  private abortController?: AbortController;

  private constructor() {}

  async downloadFile(
    params: {
      file: DriveFileData;
      isWorkspace: boolean;
      isBrave: boolean;
      credentials: any;
    },
    callbacks: {
      onProgress: (progress: number) => void;
      onSuccess: (fileId: string) => void;
      onError: (error: any) => void;
      onBlob: (blob: Blob) => void;
      onChunk: (chunk: Uint8Array) => void;
    },
    abortController?: AbortController,
  ) {
    const { file, isWorkspace, isBrave, credentials } = params;
    this.abortController = abortController ?? new AbortController();

    try {
      console.log('[DOWNLOAD-WORKER] Downloading file -->', {
        fileName: file.plainName ?? file.name,
        type: file.type,
      });

      const downloadedFile = await createFileDownloadStream(
        file,
        callbacks.onProgress,
        this.abortController,
        credentials,
      );

      if (isBrave) {
        const blob = await binaryStreamToBlob(downloadedFile, file.type);
        callbacks.onBlob(blob);
      } else {
        await this.downloadUsingChunks(downloadedFile, callbacks.onChunk);
      }

      callbacks.onSuccess(file.fileId);
    } catch (err) {
      console.log('[DOWNLOAD-WORKER] ERROR -->', err);
      const errorCloned = {
        message: err instanceof Error ? err.message : String(err),
        ...(err instanceof Error && err.stack && { stack: err.stack }),
      };
      callbacks.onError(errorCloned);
    }
  }

  private async downloadUsingChunks(
    downloadedFile: ReadableStream<Uint8Array<ArrayBufferLike>>,
    onChunk: (chunk: Uint8Array) => void,
  ) {
    console.log('[DOWNLOAD-WORKER] Downloading using readable stream');
    const reader = downloadedFile.getReader();
    let hasMoreData = true;

    try {
      while (hasMoreData) {
        const { done, value } = await reader.read();
        hasMoreData = !done;

        if (!done) {
          const chunk = value instanceof Uint8Array ? value.slice() : new Uint8Array(value);
          onChunk(chunk);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
