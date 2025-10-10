import { DriveItemData } from '../../types';
import { AdvancedSharedItem } from '../../../share/types';
import { MenuItemType } from '@internxt/ui';

export type TopBarActionsMenu =
  | Array<MenuItemType<DriveItemData>>
  | Array<MenuItemType<AdvancedSharedItem>>
  | undefined;
