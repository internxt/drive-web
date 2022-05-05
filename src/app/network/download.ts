import { Network } from '@internxt/sdk/dist/network';
import { NetworkFacade } from 'app/network';
import { Environment } from '@internxt/inxt-js';
import { ActionState } from '@internxt/inxt-js/build/api';
import { createDecipheriv, Decipher } from 'crypto';
import { EventEmitter } from 'events';

import { getFileInfoWithAuth, getFileInfoWithToken, getMirrors, Mirror } from './requests';
import { buildProgressStream, joinReadableBinaryStreams } from 'app/core/services/stream.service';
import { sha256 } from './crypto';
import { Abortable } from './Abortable';
import fetchFileBlob from 'app/drive/services/download.service/fetchFileBlob';
import localStorageService from 'app/core/services/local-storage.service';
import databaseService, { DatabaseCollection } from 'app/database/services/database.service';
import { SerializablePhoto } from 'app/store/slices/photos';
import { getEnvironmentConfig } from 'app/drive/services/network.service';
import { FileVersionOneError } from '@internxt/sdk/dist/network/download';

export type DownloadProgressCallback = (totalBytes: number, downloadedBytes: number) => void;
export type Downloadable = { fileId: string, bucketId: string };

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
  decipher: Decipher
): [ReadableStream<Uint8Array>, Abortable] {
  const eventEmitter = new EventEmitter();
  const reader = joinReadableBinaryStreams(encryptedContentSlices).getReader();

  const decryptedStream = new ReadableStream({
    async pull(controller) {
      const status = await reader.read();

      if (status.done) {
        controller.close();
      } else {
        controller.enqueue(decipher.update(status.value));
      }
    },
    cancel() {
      reader.cancel();
    }
  });

  eventEmitter.once('abort', () => {
    decryptedStream.cancel();
  });

  return [
    decryptedStream,
    {
      abort: () => {
        eventEmitter.emit('abort');
      },
    },
  ];
}

function getFileDownloadStream(downloadUrls: string[], decipher: Decipher): [Promise<ReadableStream>, Abortable] {
  let abortable: Abortable = {
    abort: () => null
  };

  const downloadPromise = (async () => {
    const encryptedContentParts: ReadableStream<Uint8Array>[] = [];

    for (const downloadUrl of downloadUrls) {
      const encryptedStream = await fetch(downloadUrl).then((res) => {
        if (!res.body) {
          throw new Error('No content received');
        }

        return res.body;
      });

      encryptedContentParts.push(encryptedStream);
    }

    const [decryptedStream, decryptAbortable] = getDecryptedStream(encryptedContentParts, decipher);

    abortable = decryptAbortable;

    return decryptedStream;
  })();

  return [
    downloadPromise,
    {
      abort: () => {
        abortable.abort();
      },
    },
  ];
}

interface NetworkCredentials {
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
    notifyProgress: DownloadProgressCallback
  }
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

function getAuthFromCredentials(creds: NetworkCredentials): { username: string, password: string } {
  return {
    username: creds.user,
    password: sha256(Buffer.from(creds.pass)).toString('hex'),
  };
}

type DownloadFileResponse = { abortable: Abortable, promise: DownloadFilePromise };
type DownloadFilePromise = Promise<ReadableStream<Uint8Array>>;

export function downloadFile(params: IDownloadParams): [
  Promise<ReadableStream<Uint8Array>>,
  Abortable
] {
  const [downloadFileV2Promise, downloadFileV2Abortable] = _downloadFileV2(params);

  const response: DownloadFileResponse = {
    abortable: downloadFileV2Abortable,
    promise: downloadFileV2Promise.catch((err) => {
      if (err instanceof FileVersionOneError) {
        const [downloadFilePromise, downloadFileAbortable] = _downloadFile(params);

        response.abortable = downloadFileAbortable;

        return downloadFilePromise;
      } else {
        throw err;
      }
    })
  };

  return [response.promise, response.abortable];
}

function _downloadFile(params: IDownloadParams): [
  Promise<ReadableStream<Uint8Array>>,
  Abortable
] {
  const { bucketId, fileId, token, creds } = params;
  let abortable: Abortable = {
    abort: () => null,
  };

  const downloadFilePromise = (async () => {
    let metadata: MetadataRequiredForDownload;

    if (creds) {
      metadata = await getRequiredFileMetadataWithAuth(bucketId, fileId, creds);
    } else if (token) {
      metadata = await getRequiredFileMetadataWithToken(bucketId, fileId, token);
    } else {
      throw new Error('Download error 1');
    }

    const { mirrors, fileMeta } = metadata;
    const downloadUrls: string[] = mirrors.map((m) => process.env.REACT_APP_PROXY + '/' + m.url);

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

    const [downloadStreamPromise, downloadAbortable] = await getFileDownloadStream(
      downloadUrls,
      createDecipheriv('aes-256-ctr', key, iv),
    );

    abortable = downloadAbortable;

    return downloadStreamPromise.then((readable) => {
      return buildProgressStream(readable, (readBytes) => {
        params.options?.notifyProgress(metadata.fileMeta.size, readBytes);
      });
    });
  })();

  return [downloadFilePromise, abortable];
}

function _downloadFileV2(params: IDownloadParams): [
  Promise<ReadableStream<Uint8Array>>,
  Abortable
] {
  // TODO: Use 'token' to download shared files
  const { bucketId, fileId, creds } = params;
  const abortable: Abortable = {
    abort: () => null
  };

  const downloadFilePromise = (async () => {
    const auth = getAuthFromCredentials(creds as NetworkCredentials);

    return new NetworkFacade(
      Network.client(
        process.env.REACT_APP_STORJ_BRIDGE as string,
        {
          clientName: 'drive-web',
          clientVersion: '1.0'
        },
        {
          bridgeUser: auth.username,
          userId: auth.password
        }
      )
    ).download(bucketId, fileId, params.mnemonic as string, {
      downloadingCallback: params.options?.notifyProgress,
    });
  })();

  return [downloadFilePromise, abortable];
}

export function downloadFileToFileSystem(
  params: IDownloadParams & { destination: WritableStream },
): [Promise<void>, Abortable] {
  const [downloadStreamPromise, abortable] = downloadFile(params);

  return [downloadStreamPromise.then((readable) => readable.pipeTo(params.destination)), abortable];
}

export async function getPhotoPreview({
  photo,
  bucketId,
}: {
  photo: SerializablePhoto;
  bucketId: string;
}): Promise<string> {
  const previewInCache = await databaseService.get(DatabaseCollection.Photos, photo.id);
  let blob: Blob;

  if (previewInCache && previewInCache.preview) blob = previewInCache.preview;
  else {
    const { previewLink: link, previewIndex: index } = photo;
    const mnemonic = localStorageService.getUser()?.mnemonic as string;
    const indexBuf = Buffer.from(index, 'hex');
    const iv = indexBuf.slice(0, 16);
    const key = await generateFileKey(mnemonic, bucketId, indexBuf);
    const [downloadStreamPromise] = getFileDownloadStream([link], createDecipheriv('aes-256-ctr', key, iv));

    const readable = await downloadStreamPromise;

    blob = await binaryStreamToBlob(readable);
    databaseService.put(DatabaseCollection.Photos, photo.id, { preview: blob });
  }

  const url = URL.createObjectURL(blob);

  return url;
}

export async function getPhotoBlob({
  photo,
  bucketId,
}: {
  photo: SerializablePhoto;
  bucketId: string;
}): Promise<[Promise<Blob>, ActionState | undefined]> {
  const previewInCache = await databaseService.get(DatabaseCollection.Photos, photo.id);
  let promise: Promise<Blob>;
  let actionState: ActionState | undefined;

  if (previewInCache && previewInCache.source) {
    promise = Promise.resolve(previewInCache.source);
  } else {
    const [blobPromise, blobActionState] = fetchFileBlob(
      { fileId: photo.fileId, bucketId },
      { updateProgressCallback: () => undefined },
    );

    promise = blobPromise.then((blob) => {
      databaseService.get(DatabaseCollection.Photos, photo.id).then((previewInCacheRefresh) => {
        databaseService.put(DatabaseCollection.Photos, photo.id, { ...(previewInCacheRefresh ?? {}), source: blob });
      });
      return blob;
    });

    actionState = blobActionState as ActionState;
  }

  return [promise, actionState];
}

export async function getPhotoCachedOrStream({
  photo,
  bucketId,
  onProgress,
}: {
  photo: SerializablePhoto;
  bucketId: string;
  onProgress?: (progress: number) => void;
}): Promise<Promise<Blob> | [Promise<ReadableStream<Uint8Array>>, ActionState]> {
  const previewInCache = await databaseService.get(DatabaseCollection.Photos, photo.id);
  if (previewInCache && previewInCache.source) {
    onProgress?.(1);
    return Promise.resolve(previewInCache.source);
  }

  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig();

  const [promise, abortable] = downloadFile({
    bucketId,
    fileId: photo.fileId,
    creds: {
      pass: bridgePass,
      user: bridgeUser
    },
    mnemonic: encryptionKey,
    options: {
      notifyProgress: (progress) => onProgress && onProgress(progress)
    }
  });

  return [promise, {
    stop: () => {
      abortable.abort();
    }
  } as ActionState];
}
