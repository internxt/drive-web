import { ActionState } from '@internxt/inxt-js/build/api';
import { getEnvironmentConfig } from '../network.service';
import { downloadFile, Abortable } from '../network.service/download';

export default function fetchFileStream(
  item: { fileId: string; bucket: string },
  options: { updateProgressCallback: (progress: number) => void; isTeam?: boolean },
): [Promise<ReadableStream<Uint8Array>>, ActionState | undefined] {

  let abortable: Abortable;

  const downloadPromise = (async () => {
    const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(!!options.isTeam);

    const [fileStreamPromise, fileStreamAbortable] = downloadFile({
      bucketId: item.bucket,
      fileId: item.fileId,
      creds: {
        pass: bridgePass,
        user: bridgeUser
      },
      mnemonic: encryptionKey
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
