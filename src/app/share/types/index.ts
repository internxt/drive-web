import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { DriveFileData } from '../../drive/types';
import { NetworkCredentials } from '../../network/download';

export type AdvancedSharedItem = SharedFolders &
  SharedFiles & {
    isFolder: boolean;
    isRootLink: boolean;
    credentials: NetworkCredentials;
  };

export type PreviewFileItem = DriveFileData & {
  credentials?: NetworkCredentials;
  mnemonic?: string;
};

export type OrderBy = { field: 'views' | 'createdAt'; direction: 'ASC' | 'DESC' } | undefined;

export type SharedNamePath = {
  id: number;
  name: string;
  token: string | null;
  uuid: string;
};
