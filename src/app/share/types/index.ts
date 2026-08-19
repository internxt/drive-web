import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { FileKey, NetworkCredentials } from 'app/network/types/helper-types';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

export type AdvancedSharedItem = SharedFolders &
  SharedFiles & {
    isFolder: boolean;
    isRootLink: boolean;
    credentials: SharedNetworkCredentials;
    sharingId?: string;
    sharingType: 'public' | 'private';
    encryptedPassword: string | null;
    fileId?: string;
  };

export type SharedNetworkCredentials = {
  networkUser: string;
  networkPass: string;
  mnemonic?: string;
};

export type PreviewFileItem = DriveFileData & {
  credentials?: NetworkCredentials;
  key?: FileKey;
  folderUuid: string;
};

export type SharedNamePath = {
  id: number;
  name: string;
  token: string | null;
  uuid: string;
};

export enum UserRoles {
  Editor = 'editor',
  Reader = 'reader',
  Owner = 'owner',
}
