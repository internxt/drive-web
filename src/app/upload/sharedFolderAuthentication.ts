import { OwnerUserAuthenticationData } from 'app/network/types';
import { decryptMnemonic } from 'app/share/services/share.crypto';

export interface SharedFolderOwner {
  workspaceAuthenticationData?: OwnerUserAuthenticationData;
  filesOwnerCredentials?: { networkUser: string; networkPass: string };
  currentUser?: { email: string; mnemonic: string; bucket: string } | null;
  ownerEncryptionKey: string | null;
  ownerBucket: string | null;
}

/**
 * Credentials to upload into a folder shared with the user, so the files go to the owner's storage: the selected
 * workspace's, the user's own when they own the folder, or else the owner's. None when the owner's are unknown.
 */
export const getSharedFolderAuthenticationData = async (
  {
    workspaceAuthenticationData,
    filesOwnerCredentials,
    currentUser,
    ownerEncryptionKey,
    ownerBucket,
  }: SharedFolderOwner,
  resourcesToken: string,
): Promise<OwnerUserAuthenticationData | undefined> => {
  if (workspaceAuthenticationData) return { ...workspaceAuthenticationData, resourcesToken };

  if (!filesOwnerCredentials) return undefined;

  const ownerCredentials = {
    bridgeUser: filesOwnerCredentials.networkUser,
    bridgePass: filesOwnerCredentials.networkPass,
    token: resourcesToken,
    resourcesToken,
  };

  const isOwnerOfFolder = filesOwnerCredentials.networkUser === currentUser?.email;
  if (currentUser && isOwnerOfFolder) {
    return { ...ownerCredentials, encryptionKey: currentUser.mnemonic, bucketId: currentUser.bucket };
  }

  const ownerMnemonic = ownerEncryptionKey ? await decryptMnemonic(ownerEncryptionKey) : null;
  if (!ownerMnemonic || !ownerBucket) return undefined;

  return { ...ownerCredentials, encryptionKey: ownerMnemonic, bucketId: ownerBucket };
};
