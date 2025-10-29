import { Decipher } from 'crypto';
import { joinReadableBinaryStreams } from 'app/core/services/stream.service';
import { Abortable } from './Abortable';
import { FileVersionOneError } from '@internxt/sdk/dist/network/download';
import { downloadFileV2 } from './download/v2';
import { legacyDownload } from './download/LegacyDownload';

export type DownloadProgressCallback = (totalBytes: number, downloadedBytes: number) => void;
export type Downloadable = { fileId: string; bucketId: string; size: number };

type BinaryStream = ReadableStream<Uint8Array>;

export async function binaryStreamToBlob(stream: BinaryStream): Promise<Blob> {
  const reader = stream.getReader();
  const slices: Uint8Array[] = [];

  let finish = false;

  while (!finish) {
    const { done, value } = await reader.read();

    if (!done) {
      slices.push(value as Uint8Array);
    }

    finish = done;
  }

  return new Blob(slices as BlobPart[]);
}

export function getDecryptedStream(
  encryptedContentSlices: ReadableStream<Uint8Array>[],
  decipher: Decipher,
): ReadableStream<Uint8Array> {
  const encryptedStream = joinReadableBinaryStreams(encryptedContentSlices);

  let keepReading = true;

  const decryptedStream = new ReadableStream({
    async pull(controller) {
      if (!keepReading) return;

      const reader = encryptedStream.getReader();
      const status = await reader.read();

      if (status.done) {
        controller.close();
      } else {
        controller.enqueue(decipher.update(status.value));
      }

      reader.releaseLock();
    },
    cancel() {
      keepReading = false;
    },
  });

  return decryptedStream;
}

export interface NetworkCredentials {
  user: string;
  pass: string;
}

export interface IDownloadParams {
  bucketId: string;
  fileId: string;
  creds?: NetworkCredentials;
  mnemonic?: string;
  encryptionKey?: Buffer;
  token?: string;
  fileSize?: number;
  options?: {
    notifyProgress: DownloadProgressCallback;
    abortController?: AbortController;
  };
}

export async function downloadFile(params: IDownloadParams): Promise<ReadableStream<Uint8Array>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const downloadFileV2Promise = downloadFileV2.downloadFile(params as any);

  return downloadFileV2Promise.catch((err) => {
    if (err instanceof FileVersionOneError) {
      return legacyDownload.downloadFile(params);
    }

    throw err;
  });
}

export async function multipartDownloadFile(params: IDownloadParams): Promise<ReadableStream<Uint8Array>> {
  const multipartDownloadFileV2Promise = downloadFileV2.multipartDownload(params as any);

  return multipartDownloadFileV2Promise.catch((err) => {
    if (err instanceof FileVersionOneError) {
      return legacyDownload.downloadFile(params);
    }

    throw err;
  });
}

export function downloadFileToFileSystem(
  params: IDownloadParams & { destination: WritableStream },
): [Promise<void>, Abortable] {
  const downloadStreamPromise = downloadFile(params);

  return [downloadStreamPromise.then((readable) => readable.pipeTo(params.destination)), { abort: () => null }];
}
