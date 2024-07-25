import { Environment } from '@internxt/inxt-js';
import { createDecipheriv, Decipher } from 'crypto';

import { buildProgressStream, joinReadableBinaryStreams } from 'app/core/services/stream.service';
import { Abortable } from './Abortable';
import { getFileInfoWithAuth, getFileInfoWithToken, getMirrors, Mirror } from './requests';

import { FileVersionOneError } from '@internxt/sdk/dist/network/download';
import downloadFileV2 from './download/v2';

export type DownloadProgressCallback = (totalBytes: number, downloadedBytes: number) => void;
export type Downloadable = { fileId: string; bucketId: string };

export function loadWritableStreamPonyfill(): Promise<void> {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/web-streams-polyfill@2.0.2/dist/ponyfill.min.js';
  document.head.appendChild(script);

  return new Promise((resolve) => {
    script.onload = function () {
      resolve();
    };
  });
}

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

  return new Blob(slices);
}

const generateFileKey = Environment.utils.generateFileKey;

interface FileInfo {
  bucket: string;
  mimetype: string;
  filename: string;
  frame: string;
  size: number;
  id: string;
  created: Date;
  hmac: {
    value: string;
    type: string;
  };
  erasure?: {
    type: string;
  };
  index: string;
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

async function getFileDownloadStream(
  downloadUrls: string[],
  decipher: Decipher,
  abortController?: AbortController,
): Promise<ReadableStream> {
  const encryptedContentParts: ReadableStream<Uint8Array>[] = [];

  for (const downloadUrl of downloadUrls) {
    const useProxy =
      process.env.REACT_APP_DONT_USE_PROXY !== 'true' && !new URL(downloadUrl).hostname.includes('internxt');
    const fetchUrl = (useProxy ? process.env.REACT_APP_PROXY + '/' : '') + downloadUrl;
    const encryptedStream = await fetch(fetchUrl, { signal: abortController?.signal }).then((res) => {
      if (!res.body) {
        throw new Error('No content received');
      }

      return res.body;
    });

    encryptedContentParts.push(encryptedStream);
  }

  return getDecryptedStream(encryptedContentParts, decipher);
}

export interface NetworkCredentials {
  user: string;
  pass: string;
}

interface IDownloadParams {
  bucketId: string;
  fileId: string;
  creds?: NetworkCredentials;
  mnemonic?: string;
  encryptionKey?: Buffer;
  token?: string;
  options?: {
    notifyProgress: DownloadProgressCallback;
    abortController?: AbortController;
  };
}

interface MetadataRequiredForDownload {
  mirrors: Mirror[];
  fileMeta: FileInfo;
}

async function getRequiredFileMetadataWithToken(
  bucketId: string,
  fileId: string,
  token: string,
): Promise<MetadataRequiredForDownload> {
  const fileMeta: FileInfo = await getFileInfoWithToken(bucketId, fileId, token);
  const mirrors: Mirror[] = await getMirrors(bucketId, fileId, null, token);

  return { fileMeta, mirrors };
}

async function getRequiredFileMetadataWithAuth(
  bucketId: string,
  fileId: string,
  creds: NetworkCredentials,
): Promise<MetadataRequiredForDownload> {
  const fileMeta: FileInfo = await getFileInfoWithAuth(bucketId, fileId, creds);
  const mirrors: Mirror[] = await getMirrors(bucketId, fileId, creds);

  return { fileMeta, mirrors };
}

export function downloadFile(params: IDownloadParams): Promise<ReadableStream<Uint8Array>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const downloadFileV2Promise = downloadFileV2(params as any);

  return downloadFileV2Promise.catch((err) => {
    if (err instanceof FileVersionOneError) {
      return _downloadFile(params);
    }

    throw err;
  });
}

async function _downloadFile(params: IDownloadParams): Promise<ReadableStream<Uint8Array>> {
  const { bucketId, fileId, token, creds } = params;

  let metadata: MetadataRequiredForDownload;

  if (creds) {
    metadata = await getRequiredFileMetadataWithAuth(bucketId, fileId, creds);
  } else if (token) {
    metadata = await getRequiredFileMetadataWithToken(bucketId, fileId, token);
  } else {
    throw new Error('Download error 1');
  }

  const { mirrors, fileMeta } = metadata;
  const downloadUrls: string[] = mirrors.map((m) => m.url);

  const index = Buffer.from(fileMeta.index, 'hex');
  const iv = index.slice(0, 16);
  let key: Buffer;

  if (params.encryptionKey) {
    key = params.encryptionKey;
  } else if (params.mnemonic) {
    key = await generateFileKey(params.mnemonic, bucketId, index);
  } else {
    throw new Error('Download error code 1');
  }

  const downloadStream = await getFileDownloadStream(
    downloadUrls,
    createDecipheriv('aes-256-ctr', key, iv),
    params.options?.abortController,
  );

  return buildProgressStream(downloadStream, (readBytes) => {
    params.options?.notifyProgress(metadata.fileMeta.size, readBytes);
  });
}

export function downloadFileToFileSystem(
  params: IDownloadParams & { destination: WritableStream },
): [Promise<void>, Abortable] {
  const downloadStreamPromise = downloadFile(params);

  return [downloadStreamPromise.then((readable) => readable.pipeTo(params.destination)), { abort: () => null }];
}
