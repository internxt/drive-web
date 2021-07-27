import { RootState } from '../..';
import { DriveFileData, DriveFolderData } from '../../../models/interfaces';

const storageSelectors = {
  isCurrentFolderEmpty(state: RootState): boolean {
    return state.storage.items.length === 0;
  },
  getInfoItem(state: RootState): DriveFileData | DriveFolderData | undefined {
    return state.storage.items.find(item => item.id === state.storage.infoItemId);
  },
  isItemSelected(state: RootState): (item: DriveFileData | DriveFolderData) => boolean {
    return (item) => state.storage.selectedItems.includes(item);
  }
};

export default storageSelectors;