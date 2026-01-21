import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { DriveFileData } from 'app/drive/types';
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
  mnemonic?: string;
};

export type PreviewFileItem = DriveFileData & {
  credentials?: NetworkCredentials;
  mnemonic?: string;
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
