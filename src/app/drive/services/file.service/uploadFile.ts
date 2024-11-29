import { StorageTypes } from '@internxt/sdk/dist/drive';
import { Network } from 'app/drive/services/network.service';
import { DriveFileData } from 'app/drive/types';
import { SdkFactory } from '../../../core/factory/sdk';
import localStorageService from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import workspacesService from '../../../core/services/workspace.service';
import { AppView } from '../../../core/types';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { getEnvironmentConfig } from '../network.service';
import { generateThumbnailFromFile } from '../thumbnail.service';
import { OwnerUserAuthenticationData } from '../../../network/UploadManager';
import { FileToUpload } from './types';

export interface FileUploadOptions {
  isTeam: boolean;
  abortController?: AbortController;
  ownerUserAuthenticationData?: OwnerUserAuthenticationData;
  abortCallback?: (abort?: () => void) => void;
}

export async function uploadFile(
  userEmail: string,
  file: FileToUpload,
  updateProgressCallback: (progress: number) => void,
  options: FileUploadOptions,
  continueUploadOptions: {
    taskId: string;
    isPaused: boolean;
    isRetriedUpload: boolean;
  },
): Promise<DriveFileData> {
  const { bridgeUser, bridgePass, encryptionKey, bucketId } =
    options.ownerUserAuthenticationData ?? getEnvironmentConfig(options.isTeam);

  if (!bucketId) {
    notificationsService.show({ text: 'Login again to start uploading files', type: ToastType.Warning });
    localStorageService.clear();
    navigationService.push(AppView.Login);

    throw new Error('Bucket not found!');
  }

  const [promise, abort] = new Network(bridgeUser, bridgePass, encryptionKey).uploadFile(
    bucketId,
    {
      filecontent: file.content,
      filesize: file.size,
      progressCallback: (progress) => {
        updateProgressCallback(progress);
      },
    },
    continueUploadOptions,
  );

  options.abortCallback?.(abort?.abort);

  const fileId = await promise;

  const workspaceId = options?.ownerUserAuthenticationData?.workspaceId;
  const workspacesToken = options?.ownerUserAuthenticationData?.workspacesToken;
  const resourcesToken = options?.ownerUserAuthenticationData?.resourcesToken;

  const isWorkspacesUpload = workspaceId && workspacesToken;
  let response;

  if (isWorkspacesUpload) {
    const date = new Date();
    const workspaceFileEntry = {
      name: file.name,
      bucket: bucketId,
      fileId: fileId,
      encryptVersion: StorageTypes.EncryptionVersion.Aes03,
      folderUuid: file.parentFolderId,
      size: file.size,
      plainName: file.name,
      type: file.type,
      modificationTime: date.toISOString(),
      date: date.toISOString(),
    };

    response = await workspacesService.createFileEntry(workspaceFileEntry, workspaceId, resourcesToken);
  } else {
    const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
    const fileEntry: StorageTypes.FileEntryByUuid = {
      id: fileId,
      type: file.type,
      size: file.size,
      name: file.name,
      plain_name: file.name,
      bucket: bucketId,
      folder_id: file.parentFolderId,
      encrypt_version: StorageTypes.EncryptionVersion.Aes03,
    };

    response = await storageClient.createFileEntryByUuid(fileEntry, options.ownerUserAuthenticationData?.token);
  }
  if (!response.thumbnails) {
    response = {
      ...response,
      thumbnails: [],
    };
  }

  const generatedThumbnail = await generateThumbnailFromFile(file, response.id, userEmail, options.isTeam);
  if (generatedThumbnail?.thumbnail) {
    response.thumbnails.push(generatedThumbnail.thumbnail);
    if (generatedThumbnail.thumbnailFile) {
      generatedThumbnail.thumbnail.urlObject = URL.createObjectURL(generatedThumbnail.thumbnailFile);
      response.currentThumbnail = generatedThumbnail.thumbnail;
    }
  }

  return response;
}

export default uploadFile;
