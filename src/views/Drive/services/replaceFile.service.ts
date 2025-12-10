import { SdkFactory } from 'app/core/factory/sdk';
import { DriveFileData } from 'app/drive/types';

export interface ReplaceFilePayload {
  fileId: string;
  size: number;
}

export async function replaceFile(fileUuid: string, payload: ReplaceFilePayload): Promise<DriveFileData> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  return storageClient.replaceFile(fileUuid, payload);
}

const replaceFileService = {
  replaceFile,
};

export default replaceFileService;
