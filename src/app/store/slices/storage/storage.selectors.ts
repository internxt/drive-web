import { RootState } from '../..';
import { DriveItemData } from '../../../drive/types';
import { sessionSelectors } from '../session/session.selectors';

// const rootFolderId = (state: RootState): number => {
//   const { team } = state.team;
//   const { user } = state.user;
//   const isTeam: boolean = sessionSelectors.isTeam(state);

//   return (isTeam ? team?.root_folder_id : user?.root_folder_id) || 0;
// };

const rootFolderId = (state: RootState): string => {
  const { user } = state.user;
  console.log(user);

  const selectedWorkspace = state.workspaces.selectedWorkspace;
  return (selectedWorkspace ? selectedWorkspace?.workspaceUser.rootFolderId : user?.rootFolderId) || '';
};

const storageSelectors = {
  rootFolderId,
  currentFolderId(state: RootState): string {
    const { namePath } = state.storage;
    return namePath.length > 0 ? namePath[namePath.length - 1].uuid : rootFolderId(state);
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
