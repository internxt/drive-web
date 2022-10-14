import { DriveItemData } from '../../../types';

export enum DriveItemAction {
  Rename,
  Download,
  Share,
  Info,
  Delete,
  ShareCopyLink,
  ShareGetLink,
  ShareSettings,
  ShareDeleteLink,
}

export interface DriveExplorerItemProps {
  item: DriveItemData;
}
