import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';

export type AdvancedSharedLink = SharedFolders &
  SharedFiles & {
    isFolder: boolean;
    isRootLink: boolean;
  };

export type OrderBy = { field: 'views' | 'createdAt'; direction: 'ASC' | 'DESC' } | undefined;

export type SharedLinkItemType = {
  id: string;
  folderId: string;
  ownerId: string;
  sharedWith: string;
  encryptionKey: string;
  createdAt: string;
  updatedAt: string;
  owner_id: string;
  shared_with: string;
  folder: {
    id: number;
    uuid: string;
    parentId: number;
    parentUuid: string | null;
    name: string;
    bucket: string | null;
    userId: number;
    encryptVersion: string;
    plainName: string | null;
    deleted: boolean;
    removed: boolean;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
    removedAt: string | null;
  };
  owner: {
    uuid: string;
    email: string;
    name: string;
    lastname: string;
    avatar: string | null;
  };
  file: any;
  fileSize: number;
};
