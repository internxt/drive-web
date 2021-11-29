import { ActionState } from '@internxt/inxt-js/build/api/ActionState';
import { getEnvironmentConfig, Network } from '../network';

export default function fetchFileBlob(
  fileId: string,
  options: { updateProgressCallback: (progress: number) => void; isTeam?: boolean },
): [Promise<Blob>, ActionState | undefined] {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(!!options.isTeam);
  const network = new Network(bridgeUser, bridgePass, encryptionKey);

  return network.downloadFile(bucketId, fileId, {
    progressCallback: options.updateProgressCallback,
  });
}
