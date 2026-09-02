import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { FolderAncestor, FolderAncestorWorkspace } from '@internxt/sdk/dist/drive/storage/types';
import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { storageActions } from '..';
import { RootState } from '../../..';
import newStorageService from 'app/drive/services/new-storage.service';
import { FolderPath } from 'app/drive/types';
import { uiActions } from '../../ui';
import { StorageState } from '../storage.model';
import storageSelectors from '../storage.selectors';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import encryptedStorageService from 'services/encrypted-storage.service';
import errorService from 'services/error.service';

const parsePathNames = (breadcrumbsList: FolderAncestor[] | FolderAncestorWorkspace[]) => {
  // ADDED UNTIL WE UPDATE TYPESCRIPT VERSION
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore:next-line
  const fullPath = breadcrumbsList.toReversed();
  const fullPathParsedNamesList = fullPath.map((pathItem) => ({ ...pathItem, name: pathItem.plainName }));

  return fullPathParsedNamesList;
};

export const getAncestorsAndSetNamePath = async (uuid: string, dispatch, workspaceSelected: WorkspaceData | null) => {
  const isWorkspaceSelected = !!workspaceSelected;
  const token = await encryptedStorageService.getSharedItemAccessToken(true);
  const breadcrumbsList: FolderAncestor[] | FolderAncestorWorkspace[] = isWorkspaceSelected
    ? await newStorageService.getFolderAncestorsInWorkspace(workspaceSelected.workspace.id, 'folder', uuid, token)
    : await newStorageService.getFolderAncestors(uuid);
  const fullPathParsedNames = parsePathNames(breadcrumbsList);
  dispatch(storageActions.setNamePath(fullPathParsedNames));
};

export const goToFolderThunk = createAsyncThunk<void, FolderPath, { state: RootState }>(
  'storage/goToFolder',
  async (path: FolderPath, { getState, dispatch }) => {
    const state = getState();
    const currentPath = state.storage.currentPath;
    if (currentPath.uuid === path.uuid) {
      // no need to go to the same folder
      return;
    }

    dispatch(storageActions.setHasMoreDriveFolders({ folderId: path.uuid, status: true }));
    dispatch(storageActions.setHasMoreDriveFiles({ folderId: path.uuid, status: true }));
    dispatch(storageActions.clearCurrentThumbnailItems({ folderId: path.uuid }));
    const isInNamePath: boolean = storageSelectors.isFolderInNamePath(getState())(path.uuid);

    dispatch(storageActions.clearSelectedItems());

    dispatch(storageActions.resetDrivePagination());
    dispatch(storageActions.resetLevelsFoldersLength({ folderId: path.uuid }));

    isInNamePath ? dispatch(storageActions.popNamePathUpTo(path)) : dispatch(storageActions.pushNamePath(path));

    dispatch(uiActions.setFileInfoItem(null));
    dispatch(uiActions.setIsDriveItemInfoMenuOpen(false));

    dispatch(storageActions.setCurrentPath(path));

    if (path.uuid && !isInNamePath) {
      getAncestorsAndSetNamePath(path.uuid, dispatch, workspacesSelectors.getSelectedWorkspace(getState())).catch(
        (error) => errorService.reportError(error),
      );
    }
  },
);

export const goToFolderThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(goToFolderThunk.pending, () => undefined)
    .addCase(goToFolderThunk.fulfilled, () => undefined)
    .addCase(goToFolderThunk.rejected, () => undefined);
};
