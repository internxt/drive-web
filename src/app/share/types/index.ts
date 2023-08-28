import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';

export type AdvancedSharedItem = SharedFolders &
  SharedFiles & {
    isFolder: boolean;
    isRootLink: boolean;
  };

export type OrderBy = { field: 'views' | 'createdAt'; direction: 'ASC' | 'DESC' } | undefined;

export type SharedNamePath = {
  id: number;
  name: string;
  token: string | null;
  uuid: string;
};
