import { StorageTypes } from '@internxt/sdk/dist/drive';

import { SdkFactory } from 'app/core/factory/sdk';

export const fetchRecents = (limit: number): Promise<StorageTypes.DriveFileData[]> => {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();

  return storageClient.getRecentFilesV2(limit);
};
