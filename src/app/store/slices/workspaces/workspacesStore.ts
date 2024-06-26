import { PendingWorkspace, WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../..';
import localStorageService, { STORAGE_KEYS } from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import workspacesService from '../../../core/services/workspace.service';
import { AppView } from '../../../core/types';
import { encryptMessageWithPublicKey } from '../../../crypto/services/pgp.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import workspacesSelectors from './workspaces.selectors';

export interface PersonalWorkspace {
  uuid: string;
  name: string;
  type: 'Business' | 'Personal';
  avatar: MediaSource | null;
}

export interface WorkspacesState {
  workspaces: WorkspaceData[];
  workspaceCredentials: WorkspaceCredentialsDetails | null;
  pendingWorkspaces: PendingWorkspace[];
  selectedWorkspace: WorkspaceData | null;
  isOwner: boolean;
  isLoadingWorkspaces: boolean;
}

const initialState: WorkspacesState = {
  workspaces: [],
  workspaceCredentials: null,
  pendingWorkspaces: [],
  selectedWorkspace: null,
  isOwner: false,
  isLoadingWorkspaces: false,
};

const fetchWorkspaces = createAsyncThunk<void, undefined, { state: RootState }>(
  'workspaces/updateWorkspaces',
  async (_, { dispatch }) => {
    const workspaces = await workspacesService.getWorkspaces();

    dispatch(workspacesActions.setWorkspaces([...workspaces.availableWorkspaces]));
    dispatch(workspacesActions.setPendingWorkspaces([...workspaces.pendingWorkspaces]));

    const b2bWorkspace = localStorageService.getB2BWorkspace();
    if (b2bWorkspace) {
      const workspaceId = b2bWorkspace?.workspace.id;
      dispatch(workspacesActions.setSelectedWorkspace(workspaceId));
      dispatch(fetchCredentials());
    }
  },
);

const fetchCredentials = createAsyncThunk<void, undefined, { state: RootState }>(
  'workspaces/fetchCredentials',
  async (_, { getState, dispatch }) => {
    const state = getState();
    const selectedWorkspace = workspacesSelectors.getSelectedWorkspace(state);

    if (selectedWorkspace) {
      const workspaceId = selectedWorkspace?.workspace.id;

      const cretenditals = await workspacesService.getWorkspaceCretenditals(workspaceId);

      dispatch(workspacesActions.setCredentials(cretenditals));
    }
  },
);

const setupWorkspace = createAsyncThunk<void, { pendingWorkspace: PendingWorkspace }, { state: RootState }>(
  'workspaces/setupWorkspace',
  async ({ pendingWorkspace }, { dispatch, getState }) => {
    // ADD LOADER WHILE WORKSPACE IS SETTING UP
    try {
      const rootState = getState();
      const user = rootState.user.user;
      if (!user) {
        navigationService.push(AppView.Login);
        return;
      }
      const { mnemonic, publicKey } = user;

      const encryptedMnemonic = await encryptMessageWithPublicKey({
        message: mnemonic,
        publicKeyInBase64: publicKey,
      });

      const encryptedMnemonicInBase64 = btoa(encryptedMnemonic as string);

      await workspacesService.setupWorkspace({
        workspaceId: pendingWorkspace.id,
        name: pendingWorkspace.name,
        address: pendingWorkspace?.address ?? '',
        description: pendingWorkspace?.description ?? '',
        encryptedMnemonic: encryptedMnemonicInBase64,
      });

      const workspaces = await workspacesService.getWorkspaces();

      const selectedWorkspace = workspaces.availableWorkspaces.find(
        (workspace) => workspace.workspace.id === pendingWorkspace.id,
      );

      dispatch(workspacesActions.setSelectedWorkspace(selectedWorkspace?.workspace.id ?? null));

      if (selectedWorkspace) {
        localStorageService.set(STORAGE_KEYS.B2B_WORKSPACE, JSON.stringify(selectedWorkspace));
      }
    } catch (error) {
      notificationsService.show({ text: 'Error seting up workspace', type: ToastType.Error });
    }
  },
);

export const workspacesSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setWorkspaces: (state: WorkspacesState, action: PayloadAction<WorkspaceData[]>) => {
      state.workspaces = action.payload;
    },
    setPendingWorkspaces: (state: WorkspacesState, action: PayloadAction<PendingWorkspace[]>) => {
      state.pendingWorkspaces = action.payload;
    },
    setSelectedWorkspace: (state: WorkspacesState, action: PayloadAction<string | null>) => {
      const workspace = state.workspaces.find((workspace) => workspace.workspace.id === action.payload);
      state.selectedWorkspace = workspace ?? null;
      if (workspace) {
        localStorageService.set(STORAGE_KEYS.B2B_WORKSPACE, JSON.stringify(workspace));
      } else {
        localStorageService.set(STORAGE_KEYS.B2B_WORKSPACE, 'null');
      }
    },
    setCredentials: (state: WorkspacesState, action: PayloadAction<WorkspaceCredentialsDetails>) => {
      state.workspaceCredentials = action.payload;
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
  setupWorkspace,
};

export default workspacesSlice.reducer;
