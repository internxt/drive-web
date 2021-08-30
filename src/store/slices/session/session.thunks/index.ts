import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { sessionActions } from '..';
import { RootState } from '../../..';

import { Workspace } from '../../../../models/enums';
import localStorageService from '../../../../services/local-storage.service';
import { planThunks } from '../../plan';
import { SessionState } from '../session.model';
import { sessionSelectors } from '../session.selectors';

const changeWorkspaceThunk = createAsyncThunk<void, void, { state: RootState }>(
  'session/changeWorkspace',
  async (payload: void, { dispatch, getState }) => {
    const isTeam: boolean = sessionSelectors.isTeam(getState());
    const newWorkspace = isTeam ? Workspace.Personal : Workspace.Business;

    dispatch(sessionActions.setWorkspace(newWorkspace));
    localStorageService.set('workspace', newWorkspace);

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
