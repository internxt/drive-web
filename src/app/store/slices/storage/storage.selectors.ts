import { RootState } from '../..';
import { DriveItemData } from '../../../drive/types';
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
    const { team } = state.team;
    const isTeam: boolean = sessionSelectors.isTeam(state);

    return (isTeam ? team?.bucket : state.user.user?.bucket) || '';
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
  hasMoreFiles(state: RootState): boolean {
    return state.storage.hasMoreDriveFiles;
  },
  hasMoreFolders(state: RootState): boolean {
    return state.storage.hasMoreDriveFolders;
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

      // UNCOMMENT TO REORDER THE ITEMS
      // itemsListService.sort(
      //   filteredItems,
      //   state.storage.order.by as 'name' | 'type' | 'updatedAt' | 'size',
      //   state.storage.order.direction,
      // );

      return filteredItems;
    };
  },
  isItemSelected(state: RootState): (item: DriveItemData) => boolean {
    return (item) => state.storage.selectedItems.some((i) => item.id === i.id && item.isFolder === i.isFolder);
  },
  isSomeItemSelected: (state: RootState): boolean => state.storage.selectedItems.length > 0,
};

export default storageSelectors;
