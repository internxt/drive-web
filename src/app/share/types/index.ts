import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { NetworkCredentials } from '../../network/download';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

export type AdvancedSharedItem = SharedFolders &
  SharedFiles & {
    isFolder: boolean;
    isRootLink: boolean;
    credentials: SharedNetworkCredentials;
    sharingId?: string;
    sharingType: 'public' | 'private';
    encryptedPassword: string | null;
  };

export type SharedNetworkCredentials = {
  networkUser: string;
  networkPass: string;
  mnemonic?: string;
};

export type PreviewFileItem = DriveFileData & {
  credentials?: NetworkCredentials;
  mnemonic?: string;
  folderUuid: string;
};

export type OrderBy = { field: 'views' | 'createdAt'; direction: 'ASC' | 'DESC' } | undefined;

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
