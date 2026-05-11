import { Dispatch, SetStateAction } from 'react';
import { DriveItemData } from 'app/drive/types';

export interface DriveExplorerItemProps {
  item: DriveItemData;
  isTrash?: boolean;
  setEditNameItem?: Dispatch<SetStateAction<DriveItemData | null>>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}
