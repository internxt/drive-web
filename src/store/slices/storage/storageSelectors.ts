import { RootState } from '../..';
import { DriveFileData, DriveFolderData } from '../../../models/interfaces';

const storageSelectors = {
  rootFolderId(state: RootState): number {
    const { team } = state.team;
    const { user } = state.user;

    return (!!user?.teams ?
      team?.root_folder_id :
      user?.root_folder_id) || 0;
  },

  currentFolderId(state: RootState): number {
    const { team } = state.team;
    const { user } = state.user;
    const { namePath } = state.storage;
    const rootFolderId: number = this.rootFolderId(state);

    return namePath.length > 0 ?
      namePath[namePath.length - 1].id :
      (rootFolderId);
  },

  currentFolderPath(state: RootState): string {
    return state.storage.namePath.reduce((t, path) => `${t}${path.name}/`, '');
  },

  bucket(state: RootState): string {
    return state.user.user?.bucket || '';
  },

  isCurrentFolderEmpty(state: RootState): boolean {
    return state.storage.items.length === 0;
  },

  getInfoItem(state: RootState): DriveFileData | DriveFolderData | undefined {
    return state.storage.items.find(item => item.id === state.storage.infoItemId);
  },

  isItemSelected(state: RootState): (item: DriveFileData | DriveFolderData) => boolean {
    return (item) => state.storage.selectedItems.includes(item);
  },

  isFolderInNamePath(state: RootState): (folderId: number) => boolean {
    return (folderId) => state.storage.namePath.map(p => p.id).includes(folderId);
  }
};

export default storageSelectors;