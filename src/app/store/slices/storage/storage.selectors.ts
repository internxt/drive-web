import { RootState } from '../..';
import { DriveItemData } from '../../../drive/types';
import itemsListService from '../../../drive/services/items-list.service';
import { sessionSelectors } from '../session/session.selectors';
//import shareService from 'app/share/services/share.service';

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

  /*async isItemShared(state: RootState): Promise<(item: DriveItemData) => boolean> {

    const page = state.shared.pagination.page;
    const perPage = state.shared.pagination.perPage;
    const response = await shareService.getAllShareLinks(page, perPage, undefined);
    return (item) => response.items.some((i) => item.id.toString() === i.id && item.isFolder === i.isFolder);
  },*/

};

export default storageSelectors;
