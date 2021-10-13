import { getEnvironmentConfig, Network } from '../../lib/network';

export default function fetchFileBlob(
  fileId: string,
  options: { updateProgressCallback: (progress: number) => void; isTeam?: boolean },
) {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig(!!options.isTeam);
  const network = new Network(bridgeUser, bridgePass, encryptionKey);

  return network.downloadFile(bucketId, fileId, {
    progressCallback: options.updateProgressCallback,
  });
}
