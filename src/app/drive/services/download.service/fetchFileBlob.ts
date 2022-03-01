import { ActionState } from '@internxt/inxt-js/build/api/ActionState';
import { getEnvironmentConfig, Network } from '../network.service';

export default function fetchFileBlob(
  item: { fileId: string; bucket: string },
  options: { updateProgressCallback: (progress: number) => void; isTeam?: boolean },
): [Promise<Blob>, ActionState | undefined] {
  const { bridgeUser, bridgePass, encryptionKey } = getEnvironmentConfig(!!options.isTeam);
  const network = new Network(bridgeUser, bridgePass, encryptionKey);

  return network.downloadFile(item.bucket, item.fileId, {
    progressCallback: options.updateProgressCallback,
  });
}
