import createFileDownloadStream from 'app/drive/services/download.service/createFileDownloadStream';
import { DriveFileData } from 'app/drive/types';

export const downloadingFile = async (
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
  abortController: AbortController = new AbortController(),
  abortSignal?: { isAborted: () => boolean },
) => {
  const { file, isWorkspace, isBrave, credentials } = params;

  try {
    console.log('[DOWNLOAD-WORKER] Downloading file -->', {
      fileName: file.plainName ?? file.name,
      type: file.type,
    });

    const downloadedFile = await createFileDownloadStream(file, callbacks.onProgress, abortController, credentials);

    if (isBrave) {
      await downloadUsingBlob(downloadedFile, callbacks.onBlob, abortSignal);
    } else {
      await downloadUsingChunks(downloadedFile, callbacks.onChunk);
    }

    callbacks.onSuccess(file.fileId);
  } catch (err) {
    console.log('[DOWNLOAD-WORKER] ERROR -->', err);
    const errorCloned = JSON.parse(JSON.stringify(err));
    callbacks.onError(errorCloned);
  }
};

export const downloadUsingBlob = async (
  downloadedFile: ReadableStream<Uint8Array<ArrayBufferLike>>,
  onBlobReady: (blob: Blob) => void,
  abortSignal?: { isAborted: () => boolean },
) => {
  const reader = downloadedFile.getReader();
  const chunks: Uint8Array[] = [];
  let hasMoreData = true;

  console.log('[DOWNLOAD-WORKER] Downloading using blob');
  if (abortSignal?.isAborted()) {
    reader.releaseLock();
    return;
  }

  try {
    while (hasMoreData) {
      const { done, value } = await reader.read();
      hasMoreData = !done;

      if (!done) {
        const chunk =
          value instanceof Uint8Array
            ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
            : new Uint8Array(value);
        chunks.push(chunk);
      }
    }

    const completeBlob = new Blob(chunks as BlobPart[]);
    onBlobReady(completeBlob);
  } finally {
    reader.releaseLock();
  }
};

export const downloadUsingChunks = async (
  downloadedFile: ReadableStream<Uint8Array<ArrayBufferLike>>,
  onChunk: (chunk: Uint8Array) => void,
) => {
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
};
