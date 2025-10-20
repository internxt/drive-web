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

    let streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    const abortHandler = () => {
      if (streamReader) {
        streamReader.cancel().catch(() => {});
      }
    };

    try {
      console.log('[DOWNLOAD-WORKER] Downloading file -->', {
        fileName: file.plainName ?? file.name,
        type: file.type,
      });

      const downloadedFile = await createFileDownloadStream(
        file,
        isWorkspace,
        callbacks.onProgress,
        this.abortController,
        credentials,
      );

      streamReader = downloadedFile.getReader();
      this.abortController.signal.addEventListener('abort', abortHandler);

      if (isBrave) {
        const blob = await binaryStreamToBlob(downloadedFile, file.type);
        callbacks.onBlob(blob);
      } else {
        await this.downloadUsingChunks(streamReader, callbacks.onChunk);
      }

      callbacks.onSuccess(file.fileId);
    } catch (err) {
      console.log('[DOWNLOAD-WORKER] ERROR -->', err);
      const errorCloned = {
        message: err instanceof Error ? err.message : String(err),
        ...(err instanceof Error && err.stack && { stack: err.stack }),
      };
      callbacks.onError(errorCloned);
    } finally {
      this.abortController?.signal.removeEventListener('abort', abortHandler);
    }
  }

  private async downloadUsingChunks(
    reader: ReadableStreamDefaultReader<Uint8Array<ArrayBufferLike>>,
    onChunk: (chunk: Uint8Array) => void,
  ) {
    console.log('[DOWNLOAD-WORKER] Downloading using readable stream');
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
    } catch (error) {
      await reader.cancel();
      throw error;
    } finally {
      reader.releaseLock();
    }
  }
}
