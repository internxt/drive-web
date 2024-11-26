import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { DriveFileData } from '../../drive/types';
import { NetworkCredentials } from '../../network/download';

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
