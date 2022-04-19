import { ActionState } from '@internxt/inxt-js/build/api';
import { getEnvironmentConfig } from '../network.service';
import { downloadFile, Downloadable } from 'app/network/download';
import { Abortable } from 'app/network/Abortable';

type FetchFileStreamOptions = { updateProgressCallback: (progress: number) => void; isTeam?: boolean };

export default function fetchFileStream(
  item: Downloadable,
  options: FetchFileStreamOptions,
): [Promise<ReadableStream<Uint8Array>>, ActionState | undefined] {
  let abortable: Abortable;

  const downloadPromise = (async () => {
    const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(!!options.isTeam);

    const [fileStreamPromise, fileStreamAbortable] = downloadFile({
      bucketId: item.bucketId,
      fileId: item.fileId,
      creds: {
        pass: bridgePass,
        user: bridgeUser
      },
      mnemonic: encryptionKey,
      options: {
        notifyProgress: (totalBytes: number, downloadedBytes: number) => {
          options.updateProgressCallback(downloadedBytes / totalBytes);
        }
      }
    });

    abortable = fileStreamAbortable;

    return fileStreamPromise;
  })();

  // TODO: When inxt-js is removed, use always Abortable interface
  return [downloadPromise, {
    stop: () => {
      abortable?.abort();
    }
  } as ActionState];
}
