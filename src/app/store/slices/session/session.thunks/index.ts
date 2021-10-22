import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { sessionActions } from '..';
import { RootState } from '../../..';

import localStorageService from '../../../../core/services/local-storage.service';
import { LocalStorageItem, Workspace } from '../../../../core/types';
import { planThunks } from '../../plan';
import { SessionState } from '../session.model';
import { sessionSelectors } from '../session.selectors';

const changeWorkspaceThunk = createAsyncThunk<void, void, { state: RootState }>(
  'session/changeWorkspace',
  async (payload: void, { dispatch, getState }) => {
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const newWorkspace = isTeam ? Workspace.Individuals : Workspace.Business;

    dispatch(sessionActions.setWorkspace(newWorkspace));
    localStorageService.set(LocalStorageItem.Workspace, newWorkspace);

    // TODO: encapsulate reset storage logic

    dispatch(planThunks.initializeThunk());
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
