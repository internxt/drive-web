import { PendingWorkspace, WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../..';
import localStorageService, { STORAGE_KEYS } from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import workspacesService from '../../../core/services/workspace.service';
import { AppView } from '../../../core/types';
import { encryptMessageWithPublicKey } from '../../../crypto/services/pgp.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { planThunks } from '../plan';
import sessionThunks from '../session/session.thunks';
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
  async (_, { dispatch, getState }) => {
    const state = getState();
    const isUserLogged = state.user.user;

    if (isUserLogged) {
      const workspaces = await workspacesService.getWorkspaces();

      dispatch(workspacesActions.setWorkspaces([...workspaces.availableWorkspaces]));
      dispatch(workspacesActions.setPendingWorkspaces([...workspaces.pendingWorkspaces]));
      dispatch(planThunks.initializeThunk());
    }
  },
);

const checkAndSetLocalWorkspace = createAsyncThunk<void, undefined, { state: RootState }>(
  'workspaces/configureWorkspaces',
  async (_, { dispatch }) => {
    const b2bWorkspace = localStorageService.getB2BWorkspace();
    if (b2bWorkspace) {
      const workspaceId = b2bWorkspace?.workspace.id;
      dispatch(setSelectedWorkspace({ workspaceId }));
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
      localStorageService.set(STORAGE_KEYS.WORKSPACE_CREDENTIALS, JSON.stringify(cretenditals));
    }
  },
);

const setSelectedWorkspace = createAsyncThunk<void, { workspaceId: string | null }, { state: RootState }>(
  'workspaces/setSelectedWorkspace',
  async ({ workspaceId }, { dispatch, getState }) => {
    const state = getState();
    const selectedWorkspace = state.workspaces.selectedWorkspace;
    const localStorageB2BWorkspace = localStorageService.getB2BWorkspace();

    const isUnselectingWorkspace = workspaceId === null;
    const isSelectedWorkspace = localStorageB2BWorkspace?.workspace.id === workspaceId;

    if (isUnselectingWorkspace) {
      localStorageService.set(STORAGE_KEYS.B2B_WORKSPACE, 'null');
      dispatch(workspacesActions.setSelectedWorkspace(null));
      dispatch(workspacesActions.setCredentials(null));
      localStorageService.set(STORAGE_KEYS.WORKSPACE_CREDENTIALS, 'null');
    } else if (isSelectedWorkspace) {
      dispatch(workspacesActions.setSelectedWorkspace(localStorageB2BWorkspace ?? null));
    } else {
      const workspace = state.workspaces.workspaces.find((workspace) => workspace.workspace.id === workspaceId);
      if (workspace) {
        localStorageService.set(STORAGE_KEYS.B2B_WORKSPACE, JSON.stringify(workspace));
        dispatch(workspacesActions.setSelectedWorkspace(workspace ?? null));
      }
    }

    if (workspaceId && workspaceId !== selectedWorkspace?.workspace.id) {
      dispatch(fetchCredentials());
    }
    dispatch(sessionThunks.changeWorkspaceThunk());
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

      dispatch(workspacesActions.setSelectedWorkspace(selectedWorkspace ?? null));

      if (selectedWorkspace) {
        localStorageService.set(STORAGE_KEYS.B2B_WORKSPACE, JSON.stringify(selectedWorkspace));
        dispatch(planThunks.fetchBusinessLimitUsageThunk());
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
    setSelectedWorkspace: (state: WorkspacesState, action: PayloadAction<WorkspaceData | null>) => {
      state.selectedWorkspace = action.payload;
    },
    setCredentials: (state: WorkspacesState, action: PayloadAction<WorkspaceCredentialsDetails | null>) => {
      state.workspaceCredentials = action.payload;
    },
  },
  // TODO: TO CHANGE MESSAGES
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
      })
      .addCase(setSelectedWorkspace.pending, (state) => {
        state.isLoadingWorkspaces = true;
      })
      .addCase(setSelectedWorkspace.fulfilled, (state) => {
        state.isLoadingWorkspaces = false;
      })
      .addCase(setSelectedWorkspace.rejected, (state, action) => {
        const errorMsg = action.payload ? action.payload : '';

        state.isLoadingWorkspaces = false;
        notificationsService.show({
          text: 'Changing workspace error ' + errorMsg,
          type: ToastType.Warning,
        });
      })
      .addCase(fetchCredentials.pending, (state) => {
        state.isLoadingWorkspaces = true;
      })
      .addCase(fetchCredentials.fulfilled, (state) => {
        state.isLoadingWorkspaces = false;
      })
      .addCase(fetchCredentials.rejected, (state, action) => {
        const errorMsg = action.payload ? action.payload : '';

        state.isLoadingWorkspaces = false;
        notificationsService.show({
          text: 'Fetching workspace credentials error ' + errorMsg,
          type: ToastType.Warning,
        });
      })
      .addCase(setupWorkspace.pending, (state) => {
        state.isLoadingWorkspaces = true;
      })
      .addCase(setupWorkspace.fulfilled, (state) => {
        state.isLoadingWorkspaces = false;
      })
      .addCase(setupWorkspace.rejected, (state, action) => {
        const errorMsg = action.payload ? action.payload : '';

        state.isLoadingWorkspaces = false;
        notificationsService.show({ text: 'Setting up workspace error ' + errorMsg, type: ToastType.Warning });
      })
      .addCase(checkAndSetLocalWorkspace.pending, (state) => {
        state.isLoadingWorkspaces = true;
      })
      .addCase(checkAndSetLocalWorkspace.fulfilled, (state) => {
        state.isLoadingWorkspaces = false;
      })
      .addCase(checkAndSetLocalWorkspace.rejected, (state, action) => {
        const errorMsg = action.payload ? action.payload : '';

        state.isLoadingWorkspaces = false;
        notificationsService.show({ text: 'checking workspaces error ' + errorMsg, type: ToastType.Warning });
      });
  },
});

export const workspacesActions = workspacesSlice.actions;

export const workspaceThunks = {
  fetchWorkspaces,
  setupWorkspace,
  fetchCredentials,
  setSelectedWorkspace,
  checkAndSetLocalWorkspace,
};

export default workspacesSlice.reducer;
