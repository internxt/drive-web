import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';

import { storageActions, StorageState } from '.';
import fileService from '../../../services/file.service';
import folderService from '../../../services/folder.service';
import storageService from '../../../services/storage.service';

export const fetchFolderContentThunk = createAsyncThunk(
  'storage/fetchFolderContent',
  async (folderId: number = -1, { getState, dispatch }: any) => {
    const { user } = getState().user;
    const { currentFolderId, sortFunction, searchFunction } = getState().storage;
    const isTeam: boolean = !!user.teams;

    folderId = ~folderId ? folderId : currentFolderId;

    await fileService.fetchWelcomeFile(isTeam);
    const content = await folderService.fetchFolderContent(folderId, isTeam);

    dispatch(
      storageActions.resetSelectedItems()
    );

    // Apply search function if is set
    if (searchFunction) {
      content.newCommanderFolders = content.newCommanderFolders.filter(searchFunction);
      content.newCommanderFiles = content.newCommanderFiles.filter(searchFunction);
    }
    // Apply sort function if is set
    if (sortFunction) {
      content.newCommanderFolders.sort(sortFunction);
      content.newCommanderFiles.sort(sortFunction);
    }

    dispatch(
      storageActions.setCurrentFolderId(content.contentFolders.id)
    );
    dispatch(
      storageActions.setItems(_.concat(content.newCommanderFolders, content.newCommanderFiles))
    );
    dispatch(
      storageActions.setCurrentFolderBucket(content.contentFolders.bucket)
    );

    if (updateNamePath) {
      // Only push path if it is not the same as actual path
      const folderName = this.updateNamesPaths(user, content.contentFolders, this.state.namePath);

      this.setState({
        namePath: this.pushNamePath({
          name: folderName,
          id: content.contentFolders.id,
          bucket: content.contentFolders.bucket,
          id_team: content.contentFolders.id_team
        }),
        isAuthorized: true
      });
    }
  }
);

export const deleteItemsThunk = createAsyncThunk(
  'storage/deleteItems',
  async (undefined, { getState, dispatch }: any) => {
    const { user } = getState().user;
    const { items, itemsToDeleteIds, currentFolderId } = getState().storage;
    const itemsToDelete: any[] = items.filter(item => itemsToDeleteIds.includes(item.id));

    console.log(itemsToDelete);
    await storageService.deleteItems(itemsToDelete);

    dispatch(fetchFolderContentThunk(currentFolderId));
  }
);

export const goToFolderThunk = createAsyncThunk(
  'storage/goToFolder',
  async (folderId: number, { getState, dispatch }: any) => {
    dispatch(storageActions.setCurrentFolderId(folderId));
    await dispatch(fetchFolderContentThunk(folderId));
  }
);

export const extraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(fetchFolderContentThunk.pending, (state, action) => {
      state.isLoading = true;
    })
    .addCase(fetchFolderContentThunk.fulfilled, (state, action) => {
      state.isLoading = false;
    })
    .addCase(fetchFolderContentThunk.rejected, (state, action: any) => {
      state.isLoading = false;
      toast.warn(action.payload);
    });

  builder
    .addCase(deleteItemsThunk.pending, (state, action) => {
      state.isDeletingItems = true;
    })
    .addCase(deleteItemsThunk.fulfilled, (state, action) => {
      state.isDeletingItems = false;
    })
    .addCase(deleteItemsThunk.rejected, (state, action) => {
      state.isDeletingItems = false;
    });

  builder
    .addCase(goToFolderThunk.pending, (state, action) => { })
    .addCase(goToFolderThunk.fulfilled, (state, action) => { })
    .addCase(goToFolderThunk.rejected, (state, action) => { });
};

const thunks = {
  fetchFolderContentThunk,
  deleteItemsThunk,
  goToFolderThunk
};

export default thunks;