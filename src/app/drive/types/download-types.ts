import { Iterator } from 'app/core/collections';
import { DriveFileData, DriveFolderData } from '.';
import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import errorService from 'app/core/services/error.service';
import { ConnectionLostError } from 'app/network/requests';
import { ErrorMessages } from 'app/core/constants';

export type DownloadFilesType = DriveFileData[] & SharedFiles[];

export type FolderIterator = (directoryUUID: string, workspaceId?: string) => Iterator<DriveFolderData>;
export type FileIterator = (directoryUUID: string, workspaceId?: string) => Iterator<DriveFileData>;

export type SharedFolderIterator = (directoryId: string, resourcesToken?: string) => Iterator<SharedFolders>;
export type SharedFileIterator = (directoryId: string, resourcesToken?: string) => Iterator<SharedFiles>;

export const isLostConnectionError = (error: unknown) => {
  const castedError = errorService.castError(error);
  const isLostConnectionError =
    error instanceof ConnectionLostError ||
    [ErrorMessages.ConnectionLost.toLowerCase(), ErrorMessages.NetworkError.toLowerCase()].includes(
      castedError.message.toLowerCase() as ErrorMessages,
    );

  return isLostConnectionError;
};
