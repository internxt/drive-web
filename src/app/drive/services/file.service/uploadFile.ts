import { StorageTypes } from '@internxt/sdk/dist/drive';
import { Network } from 'app/drive/services/network.service';
import { DriveFileData } from 'app/drive/types';
import { SdkFactory } from 'app/core/factory/sdk';
import localStorageService from 'services/local-storage.service';
import navigationService from 'services/navigation.service';
import workspacesService from 'services/workspace.service';
import { AppView } from 'app/core/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { getEnvironmentConfig } from '../network.service';
import { generateThumbnailFromFile } from '../thumbnail.service';
import { OwnerUserAuthenticationData } from 'app/network/types';
import { FileToUpload } from './types';

export interface FileUploadOptions {
  isTeam: boolean;
  abortController?: AbortController;
  ownerUserAuthenticationData?: OwnerUserAuthenticationData;
  abortCallback?: (abort?: () => void) => void;
  isUploadedFromFolder?: boolean;
}

class RetryableFileError extends Error {
  constructor(public file: FileToUpload) {
    super('Retryable file');
    this.name = 'RetryableFileError';
  }
}

interface UploadFileProps {
  isWorkspaceUpload: boolean;
  file: FileToUpload;
  fileId?: string;
  bucketId: string;
  workspaceId?: string;
  resourcesToken?: string;
  ownerToken?: string;
}

export const createFileEntry = async ({
  bucketId,
  fileId,
  file,
  isWorkspaceUpload,
  workspaceId,
  resourcesToken,
  ownerToken,
}: UploadFileProps) => {
  const date = new Date();

  if (isWorkspaceUpload && workspaceId) {
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

    return workspacesService.createFileEntry(workspaceFileEntry, workspaceId, resourcesToken);
  } else {
    const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
    const fileEntry: StorageTypes.FileEntryByUuid = {
      fileId: fileId,
      type: file.type,
      size: file.size,
      plainName: file.name,
      bucket: bucketId,
      folderUuid: file.parentFolderId,
      encryptVersion: StorageTypes.EncryptionVersion.Aes03,
      modificationTime: date.toISOString(),
      date: date.toISOString(),
    };

    return storageClient.createFileEntryByUuid(fileEntry, ownerToken);
  }
};

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
  const workspaceId = options?.ownerUserAuthenticationData?.workspaceId;
  const workspacesToken = options?.ownerUserAuthenticationData?.workspacesToken;
  const resourcesToken = options?.ownerUserAuthenticationData?.resourcesToken;

  const isWorkspacesUpload = workspaceId && workspacesToken;

  if (file.size === 0) {
    return createFileEntry({
      bucketId: bucketId,
      file,
      isWorkspaceUpload: !!isWorkspacesUpload,
      resourcesToken: resourcesToken ?? workspacesToken,
      workspaceId: workspaceId,
      ownerToken: workspacesToken,
    });
  }

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
      isUploadedFromFolder: options.isUploadedFromFolder,
    },
    continueUploadOptions,
  );

  options.abortCallback?.(abort?.abort);

  const fileId = await promise;
  if (fileId === undefined) throw new RetryableFileError(file);

  let response = await createFileEntry({
    bucketId: bucketId,
    fileId: fileId,
    file,
    isWorkspaceUpload: !!isWorkspacesUpload,
    resourcesToken: resourcesToken ?? workspacesToken,
    workspaceId: workspaceId,
    ownerToken: workspacesToken,
  });

  if (!response.thumbnails) {
    response = {
      ...response,
      thumbnails: [],
    };
  }

  const generatedThumbnail = await generateThumbnailFromFile(file, response.uuid, userEmail, options.isTeam);
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
