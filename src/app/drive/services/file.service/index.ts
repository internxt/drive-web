import { StorageTypes } from '@internxt/sdk/dist/drive';
import { FileMeta } from '@internxt/sdk/dist/drive/storage/types';
import { t } from 'i18next';
import { SdkFactory } from 'app/core/factory/sdk';
import errorService from 'services/error.service';
import { DriveFileData, DriveFileMetadataPayload } from '../../types';
import uploadFile from './uploadFile';

export async function updateMetaData(
  fileId: string,
  metadata: DriveFileMetadataPayload,
  resourcesToken?: string,
): Promise<void> {
  const storageClient = await SdkFactory.getNewApiInstance().createNewStorageClient();
  const payload = { fileUuid: fileId, name: metadata.itemName };

  return storageClient.updateFileNameWithUUID(payload, resourcesToken);
}

export async function moveFileByUuid(
  fileUuid: string,
  destinationFolderUuid: string,
  newName?: string,
): Promise<StorageTypes.FileMeta> {
  const storageClient = await SdkFactory.getNewApiInstance().createNewStorageClient();
  const payload: StorageTypes.MoveFileUuidPayload = {
    destinationFolder: destinationFolderUuid,
    name: newName,
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
  const storageClient = await SdkFactory.getNewApiInstance().createNewStorageClient();
  await storageClient.deleteFileByUuid(fileData.uuid);
}

async function fetchDeleted(): Promise<DriveFileData[]> {
  const trashClient = await SdkFactory.getNewApiInstance().createTrashClient();

  const trashRequest = trashClient.getTrash();

  return trashRequest[0].then((response) => {
    const { files } = response;
    return files;
  });
}

export async function getFile(uuid: string, workspacesToken?: string): Promise<FileMeta> {
  const storageClient = await SdkFactory.getNewApiInstance().createNewStorageClient();
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
