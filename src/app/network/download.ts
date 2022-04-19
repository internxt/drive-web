import { createDecipheriv, Decipher } from 'crypto';
import { EventEmitter } from 'events';

import { Environment } from '@internxt/inxt-js';
import { Network } from '@internxt/sdk/dist/network';
import { NetworkFacade } from 'app/network';

import { getFileInfoWithAuth, getFileInfoWithToken, getMirrors, Mirror } from './requests';
import { buildProgressStream, joinReadableBinaryStreams } from 'app/core/services/stream.service';
import { sha256 } from './crypto';

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

const generateFileKey = Environment.utils.generateFileKey;

export interface Abortable {
  abort: () => void;
}

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

  let aborted = false;

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
    aborted = true;
    decryptedStream.cancel();
  });

  return [decryptedStream, {
    abort: () => {
      eventEmitter.emit('abort');
    }
  }];
}

function getFileDownloadStream(downloadUrls: string[], decipher: Decipher): [Promise<ReadableStream>, Abortable] {
  let abortable: Abortable;

  const downloadPromise = (async () => {
    const encryptedContentParts: ReadableStream<Uint8Array>[] = [];

    for (const downloadUrl of downloadUrls) {
      const encryptedStream = await fetch(downloadUrl)
        .then((res) => {
          if (!res.body) {
            throw new Error('No content received');
          }

          return res.body;
        });

      encryptedContentParts.push(encryptedStream);
    }

    const [decryptedStream, decryptAbortable] = getDecryptedStream(
      encryptedContentParts,
      decipher
    );

    abortable = decryptAbortable;

    return decryptedStream;
  })();

  return [downloadPromise, {
    abort: () => {
      abortable.abort();
    }
  }];
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
  mirrors: Mirror[],
  fileMeta: FileInfo
}

async function getRequiredFileMetadataWithToken(
  bucketId: string, fileId: string, token: string
): Promise<MetadataRequiredForDownload> {
  const fileMeta: FileInfo = await getFileInfoWithToken(bucketId, fileId, token);
  const mirrors: Mirror[] = await getMirrors(bucketId, fileId, null, token);

  return { fileMeta, mirrors };
}

async function getRequiredFileMetadataWithAuth(
  bucketId: string, fileId: string, creds: NetworkCredentials
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
      if (err.message === 'File with version 1') {
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
    abort: () => null
  };

  const downloadFilePromise = (async () => {
    let metadata: MetadataRequiredForDownload;

    if (creds) {
      metadata = await getRequiredFileMetadataWithAuth(
        bucketId,
        fileId,
        creds
      );
    } else if (token) {
      metadata = await getRequiredFileMetadataWithToken(
        bucketId,
        fileId,
        token
      );
    } else {
      throw new Error('Download error 1');
    }

    const { mirrors, fileMeta } = metadata;
    const downloadUrls: string[] = mirrors.map(m => process.env.REACT_APP_PROXY + '/' + m.url);

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
      createDecipheriv('aes-256-ctr', key, iv)
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
  const { bucketId, fileId, token, creds } = params;
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
  params: IDownloadParams &
  { destination: WritableStream }
): [Promise<void>, Abortable] {
  const [downloadStreamPromise, abortable] = downloadFile(params);

  return [
    downloadStreamPromise.then(readable => readable.pipeTo(params.destination)),
    abortable
  ];
}
