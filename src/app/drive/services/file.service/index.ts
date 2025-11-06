import { StorageTypes } from '@internxt/sdk/dist/drive';
import { FileMeta } from '@internxt/sdk/dist/drive/storage/types';
import { t } from 'i18next';
import { SdkFactory } from '../../../core/factory/sdk';
import errorService from '../../../core/services/error.service';
import { DriveFileData, DriveFileMetadataPayload } from '../../types';
import uploadFile from './uploadFile';

export function updateMetaData(
  fileId: string,
  metadata: DriveFileMetadataPayload,
  resourcesToken?: string,
): Promise<void> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  const payload = { fileUuid: fileId, name: metadata.itemName };

  return storageClient.updateFileNameWithUUID(payload, resourcesToken);
}

export async function moveFileByUuid(fileUuid: string, destinationFolderUuid: string): Promise<StorageTypes.FileMeta> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  const payload: StorageTypes.MoveFileUuidPayload = {
    destinationFolder: destinationFolderUuid,
  };
  return storageClient
    .moveFileByUuid(fileUuid, payload)
    .then((response) => {
      return response;
    })
    .catch((error) => {
      const castedError = errorService.castError(error);
      if (castedError.status) {
        castedError.message = t(`tasks.move-file.errors.${castedError.status}`);
      }
      throw castedError;
    });
}

export async function deleteFile(fileData: DriveFileData): Promise<void> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  await storageClient.deleteFileByUuid(fileData.uuid);
}

async function fetchDeleted(): Promise<DriveFileData[]> {
  const trashClient = SdkFactory.getNewApiInstance().createTrashClient();

  const trashRequest = trashClient.getTrash();

  return trashRequest[0].then((response) => {
    const { files } = response;
    return files;
  });
}

export function getFile(uuid: string, workspacesToken?: string): Promise<FileMeta> {
  const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
  const [responsePromise] = storageClient.getFile(uuid, workspacesToken);

  return responsePromise;
}

const fileService = {
  updateMetaData,
  moveFileByUuid,
  uploadFile,
  fetchDeleted,
  getFile,
};

export default fileService;
