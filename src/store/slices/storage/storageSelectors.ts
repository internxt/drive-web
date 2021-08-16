import { RootState } from '../..';
import { DriveItemData } from '../../../models/interfaces';
import { selectorIsTeam } from '../team';

const storageSelectors = {
  rootFolderId(state: RootState): number {
    const { team } = state.team;
    const { user } = state.user;

    const isTeam: boolean = selectorIsTeam(state);

    return (isTeam ?
      team?.root_folder_id :
      user?.root_folder_id) || 0;
  },

  currentFolderId(state: RootState): number {
    const { namePath } = state.storage;
    const rootFolderId: number = this.rootFolderId(state);

    return namePath.length > 0 ?
      namePath[namePath.length - 1].id :
      (rootFolderId);
  },

  currentFolderPath(state: RootState): string {
    return state.storage.namePath.reduce((t, path) => `${t}${path.name}/`, '/');
  },

  bucket(state: RootState): string {
    return state.user.user?.bucket || '';
  },

  isCurrentFolderEmpty(state: RootState): boolean {
    return state.storage.lists.drive.length === 0;
  },

  getInfoItem(state: RootState): DriveItemData | undefined {
    return state.storage.lists.drive.find(item => item.id === state.storage.infoItem?.id);
  },

  isItemSelected(state: RootState): (item: DriveItemData) => boolean {
    return (item) => state.storage.selectedItems.some(i => item.id === i.id);
  },

  isSomeItemSelected: (state: RootState): boolean => state.storage.selectedItems.length > 0,
  isFolderInNamePath(state: RootState): (folderId: number) => boolean {
    return (folderId) => state.storage.namePath.map(p => p.id).includes(folderId);
  },

  filteredItems(state: RootState): (items: DriveItemData[]) => DriveItemData[] {
    return (items) => items.filter(item => {
      const filters = state.storage.filters;
      const fullName = item.isFolder ? item.name : item.name + `.${item.type}`;

      return fullName.toLowerCase().match(filters.text.toLowerCase());
    });
  }
};

export default storageSelectors;