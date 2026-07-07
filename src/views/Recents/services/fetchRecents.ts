import { StorageTypes } from '@internxt/sdk/dist/drive';

import { SdkFactory } from 'app/core/factory/sdk';

export const fetchRecents = async (limit: number): Promise<StorageTypes.DriveFileData[]> => {
  const storageClient = await SdkFactory.getNewApiInstance().createNewStorageClient();

  return storageClient.getRecentFilesV2(limit);
};
