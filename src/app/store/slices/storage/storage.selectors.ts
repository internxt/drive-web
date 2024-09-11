import { RootState } from '../..';
import { DriveItemData } from '../../../drive/types';

const rootFolderId = (state: RootState): string => {
  const { user } = state.user;

  const selectedWorkspace = state.workspaces.selectedWorkspace;
  const rootFolderId = (selectedWorkspace ? selectedWorkspace?.workspaceUser.rootFolderId : user?.rootFolderId) ?? '';
  return rootFolderId;
};

const storageSelectors = {
  rootFolderId,
  currentFolderId(state: RootState): string {
    const { namePath } = state.storage;

    const currentFolderId = namePath.length > 0 ? namePath[namePath.length - 1].uuid : rootFolderId(state);
    return currentFolderId;
  },
  currentFolderPath(state: RootState): string {
    return state.storage.namePath.reduce((t, path) => `${t}${path.name}/`, '/');
  },
  bucket(state: RootState): string {
    return state.user.user?.bucket ?? '';
  },
  isCurrentFolderEmpty(state: RootState): boolean {
    const currentFolderId = this.currentFolderId(state);
    return this.levelItems(state)(currentFolderId).length === 0;
  },
  isFolderInNamePath(state: RootState): (folderId: string) => boolean {
    return (folderId) => state.storage.namePath.map((p) => p.uuid).includes(folderId);
  },
  currentFolderItems(state: RootState): DriveItemData[] {
    const currentFolderId = this.currentFolderId(state);
    return this.levelItems(state)(currentFolderId);
  },
  hasMoreFiles(state: RootState): boolean {
    return state.storage.hasMoreDriveFiles[state.storage.currentPath.uuid];
  },
  hasMoreFolders(state: RootState): boolean {
    return state.storage.hasMoreDriveFolders[state.storage.currentPath.uuid];
  },
  levelItems(state: RootState): (folderId: string) => DriveItemData[] {
    return (folderId) => state.storage.levels[folderId] || [];
  },
  filteredItems(state: RootState): (items: DriveItemData[]) => DriveItemData[] {
    return (items) => {
      const filteredItems = items.filter((item) => {
        const filters = state.storage.filters;
        const fullName = item.isFolder ? item.name : item.name + `.${item.type}`;

        return fullName.toLowerCase().match(filters.text.toLowerCase());
      });

      return filteredItems;
    };
  },
  isItemSelected(state: RootState): (item: DriveItemData) => boolean {
    return (item) => state.storage.selectedItems.some((i) => item.id === i.id && item.isFolder === i.isFolder);
  },
  isSomeItemSelected: (state: RootState): boolean => state.storage.selectedItems.length > 0,
};

export default storageSelectors;
