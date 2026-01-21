import { ShareLink } from '@internxt/sdk/dist/drive/storage/types';
import { DriveItemData } from 'app/drive/types';
import { AdvancedSharedItem } from 'app/share/types';

export interface IRoot {
  name: string;
  folderId: string | null;
  childrenFiles: File[];
  childrenFolders: IRoot[];
  fullPathEdited: string;
}

export interface ItemToShare {
  share?: ShareLink;
  sharings?: { type: string; id: string }[];
  item: DriveItemData | (AdvancedSharedItem & { user: { email: string } });
}
