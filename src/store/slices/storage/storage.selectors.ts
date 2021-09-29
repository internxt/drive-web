import { RootState } from '../..';
import { DriveItemData } from '../../../models/interfaces';
import itemsListService from '../../../services/items-list.service';
import { sessionSelectors } from '../session/session.selectors';

const rootFolderId = (state: RootState): number => {
  const { team } = state.team;
  const { user } = state.user;
  const isTeam: boolean = sessionSelectors.isTeam(state);

  return (isTeam ? team?.root_folder_id : user?.root_folder_id) || 0;
};

const storageSelectors = {
  rootFolderId,
  currentFolderId(state: RootState): number {
    const { namePath } = state.storage;
    return namePath.length > 0 ? namePath[namePath.length - 1].id : rootFolderId(state);
  },

  currentFolderPath(state: RootState): string {
    return state.storage.namePath.reduce((t, path) => `${t}${path.name}/`, '/');
  },

  bucket(state: RootState): string {
    return state.user.user?.bucket || '';
  },

  isCurrentFolderEmpty(state: RootState): boolean {
    const currentFolderId = this.currentFolderId(state);
    return this.levelItems(state)(currentFolderId).length === 0;
  },

  isFolderInNamePath(state: RootState): (folderId: number) => boolean {
    return (folderId) => state.storage.namePath.map((p) => p.id).includes(folderId);
  },

  currentFolderItems(state: RootState): DriveItemData[] {
    const currentFolderId = this.currentFolderId(state);
    return this.levelItems(state)(currentFolderId);
  },

  levelItems(state: RootState): (folderId: number) => DriveItemData[] {
    return (folderId) => state.storage.levels[folderId] || [];
  },

  filteredItems(state: RootState): (items: DriveItemData[]) => DriveItemData[] {
    return (items) => {
      const filteredItems = items.filter((item) => {
        const filters = state.storage.filters;
        const fullName = item.isFolder ? item.name : item.name + `.${item.type}`;

        return fullName.toLowerCase().match(filters.text.toLowerCase());
      });

      itemsListService.sort(
        filteredItems,
        state.storage.order.by as 'name' | 'type' | 'updatedAt' | 'size',
        state.storage.order.direction,
      );

      return filteredItems;
    };
  },

  isItemSelected(state: RootState): (item: DriveItemData) => boolean {
    return (item) => state.storage.selectedItems.some((i) => item.id === i.id && item.isFolder === i.isFolder);
  },

  isSomeItemSelected: (state: RootState): boolean => state.storage.selectedItems.length > 0,
};

export default storageSelectors;
