import { DriveItemData } from 'app/drive/types';
import { AdvancedSharedItem } from 'app/share/types';
import { MenuItemType } from '@internxt/ui';

export type TopBarActionsMenu =
  | Array<MenuItemType<DriveItemData>>
  | Array<MenuItemType<AdvancedSharedItem>>
  | undefined;
