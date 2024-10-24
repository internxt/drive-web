import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../../..';

import navigationService from '../../../../core/services/navigation.service';
import { AppView } from '../../../../core/types';
import { storageActions, storageSelectors } from '../../storage';
import storageThunks from '../../storage/storage.thunks';
import { fetchPaginatedFolderContentThunk } from '../../storage/storage.thunks/fetchFolderContentThunk';
import { uiActions } from '../../ui';
import { SessionState } from '../session.model';

interface ChangeWorkspacePayload {
  updateUrl?: boolean;
}

const changeWorkspaceThunk = createAsyncThunk<void, ChangeWorkspacePayload | void, { state: RootState }>(
  'session/changeWorkspace',
  async (payload: ChangeWorkspacePayload | void, { dispatch, getState }) => {
    const state = getState();
    const updateUrl = (payload as ChangeWorkspacePayload)?.updateUrl ?? true;
    // const isTeam: boolean = sessionSelectors.isTeam(state);
    // const newWorkspace = isTeam ? Workspace.Individuals : Workspace.Business;
    // dispatch(planThunks.initializeThunk());

    const rootFolderId = storageSelectors.rootFolderId(state);
    const workspaceid = state.workspaces.selectedWorkspace?.workspace.id;
    updateUrl && navigationService.push(AppView.Drive, {}, workspaceid);
    dispatch(uiActions.setIsGlobalSearch(false));
    dispatch(storageActions.resetDrivePagination());
    dispatch(storageThunks.resetNamePathThunk());
    dispatch(storageActions.clearSelectedItems());
    dispatch(fetchPaginatedFolderContentThunk(rootFolderId));
  },
);

const sessionThunks = {
  changeWorkspaceThunk,
};

export const sessionExtraReducers = (builder: ActionReducerMapBuilder<SessionState>): void => {
  builder
    .addCase(changeWorkspaceThunk.pending, () => undefined)
    .addCase(changeWorkspaceThunk.fulfilled, () => undefined)
    .addCase(changeWorkspaceThunk.rejected, () => undefined);
};

export default sessionThunks;
