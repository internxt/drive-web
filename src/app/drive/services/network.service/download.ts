import { Environment } from '@internxt/inxt-js';
import { createDecipheriv, Decipher } from 'crypto';
import { EventEmitter } from 'events';
import { getFileInfoWithAuth, getFileInfoWithToken, getMirrors, Mirror } from './requests';

export function loadWritableStreamPonyfill(): Promise<void> {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/web-streams-polyfill/dist/polyfill.min.js';
  document.head.appendChild(script);

  return new Promise((resolve) => {
    script.onload = function () {
      resolve();
    };
  });
}

const generateFileKey = Environment.utils.generateFileKey;

interface Abortable {
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

function getDecryptedStream(
  encryptedContentSlices: ReadableStream<Uint8Array>[],
  decipher: Decipher
): [ReadableStream, Abortable] {
  const eventEmitter = new EventEmitter();
  let aborted = false;

  const decryptedStream = new ReadableStream({
    async start(controller) {
      let error: Error;

      try {
        for (const encryptedContentSlice of encryptedContentSlices) {
          const reader = encryptedContentSlice.getReader();
          let done = false;

          while (!done && !aborted) {
            const status = await reader.read();

            if (!status.done) {
              controller.enqueue(decipher.update(status.value));
            }

            done = status.done;
          }
        }
      } catch (err) {
        // TODO
        error = err as Error;
      } finally {
        controller.close();
      }
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

export function downloadFile(params: IDownloadParams): [
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

    return downloadStreamPromise;
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
