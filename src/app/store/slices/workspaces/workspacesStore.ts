import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../..';
import workspacesService from '../../../core/services/workspace.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';

export interface PersonalWorkspace {
  uuid: string;
  name: string;
  type: 'Business' | 'Personal';
  avatar: MediaSource | null;
}

export interface WorkspacesState {
  workspaces: WorkspaceData[];
  selectedWorkspace: WorkspaceData | null;
  isOwner: boolean;
  isLoadingWorkspaces: boolean;
}

const initialState: WorkspacesState = {
  workspaces: [],
  selectedWorkspace: null,
  isOwner: false,
  isLoadingWorkspaces: false,
};

const fetchWorkspaces = createAsyncThunk<void, undefined, { state: RootState }>(
  'workspaces/updateWorkspaces',
  async (_, { dispatch }) => {
    const workspaces = await workspacesService.getWorkspaces();

    dispatch(workspacesActions.setWorkspaces(workspaces));
  },
);

export const workspacesSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setWorkspaces: (state: WorkspacesState, action: PayloadAction<WorkspaceData[]>) => {
      state.workspaces = action.payload;
    },
    setSelectedWorkspace: (state: WorkspacesState, action: PayloadAction<string | null>) => {
      const workspace = state.workspaces.find((workspace) => workspace.workspace.id === action.payload);
      state.selectedWorkspace = workspace ?? null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaces.pending, (state) => {
        state.isLoadingWorkspaces = true;
      })
      .addCase(fetchWorkspaces.fulfilled, (state) => {
        state.isLoadingWorkspaces = false;
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        const errorMsg = action.payload ? action.payload : '';

        state.isLoadingWorkspaces = false;
        notificationsService.show({ text: 'Fetching workspaces error ' + errorMsg, type: ToastType.Warning });
      });
  },
});

export const workspacesActions = workspacesSlice.actions;

export const workspaceThunks = {
  fetchWorkspaces,
};

export default workspacesSlice.reducer;
