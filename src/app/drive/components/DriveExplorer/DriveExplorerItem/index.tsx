import { DriveItemData } from '../../../types';

export enum DriveItemAction {
  Rename,
  Download,
  Share,
  Info,
  Delete,
}

export interface DriveExplorerItemProps {
  item: DriveItemData;
}
