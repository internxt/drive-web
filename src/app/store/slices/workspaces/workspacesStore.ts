import { PendingWorkspace, Workspace, WorkspaceCredentialsDetails, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { t } from 'i18next';
import { RootState } from '../..';
import localStorageService, { STORAGE_KEYS } from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import workspacesService from '../../../core/services/workspace.service';
import { AppView } from '../../../core/types';
import { encryptMessageWithPublicKey } from '../../../crypto/services/pgp.service';
import {
  deleteWorkspaceAvatarFromDatabase,
  saveWorkspaceAvatarToDatabase,
} from '../../../newSettings/Sections/Workspace/Overview/components/WorkspaceAvatarWrapper';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { decryptMnemonic } from '../../../share/services/share.service';
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
  isLoadingCredentials: boolean;
}

const initialState: WorkspacesState = {
  workspaces: [],
  workspaceCredentials: null,
  pendingWorkspaces: [],
  selectedWorkspace: null,
  isOwner: false,
  isLoadingWorkspaces: false,
  isLoadingCredentials: false,
};

const decryptWorkspacesMnemonic = async (workspaces: WorkspaceData[]): Promise<WorkspaceData[]> => {
  return await Promise.all(
    workspaces.map(async (workspace) => {
      return {
        ...workspace,
        workspaceUser: {
          ...workspace.workspaceUser,
          key: await decryptMnemonic(workspace.workspaceUser.key),
        },
      } as WorkspaceData;
    }),
  );
};

const fetchWorkspaces = createAsyncThunk<void, undefined, { state: RootState }>(
  'workspaces/updateWorkspaces',
  async (_, { dispatch, getState }) => {
    const state = getState();
    const isUserLogged = state.user.user;

    if (isUserLogged) {
      const workspaces = await workspacesService.getWorkspaces();
      const workspacesWithDecryptedMnemonic = await decryptWorkspacesMnemonic(workspaces.availableWorkspaces);
      dispatch(workspacesActions.setWorkspaces(workspacesWithDecryptedMnemonic));
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
    dispatch(workspacesActions.setIsLoadingCredentials(true));
    const state = getState();
    const selectedWorkspace = workspacesSelectors.getSelectedWorkspace(state);

    if (selectedWorkspace) {
      const workspaceId = selectedWorkspace?.workspace.id;

      const credentials = await workspacesService.getWorkspaceCredentials(workspaceId);

      dispatch(workspacesActions.setCredentials(credentials));
      localStorageService.set(STORAGE_KEYS.WORKSPACE_CREDENTIALS, JSON.stringify(credentials));
    }
    dispatch(workspacesActions.setIsLoadingCredentials(false));
  },
);

const setSelectedWorkspace = createAsyncThunk<
  void,
  { workspaceId: string | null; updateUrl?: boolean },
  { state: RootState }
>('workspaces/setSelectedWorkspace', async ({ workspaceId, updateUrl = true }, { dispatch, getState }) => {
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
  dispatch(sessionThunks.changeWorkspaceThunk({ updateUrl }));
});

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

      // to avoid backend update delay
      setTimeout(async () => {
        const workspaces = await workspacesService.getWorkspaces();

        const workspacesWithDecryptedMnemonic = await decryptWorkspacesMnemonic(workspaces.availableWorkspaces);

        const selectedWorkspace = workspacesWithDecryptedMnemonic.find(
          (workspace) => workspace.workspace.id === pendingWorkspace.id,
        );

        dispatch(workspacesActions.setWorkspaces(workspacesWithDecryptedMnemonic));
        dispatch(workspacesActions.setPendingWorkspaces([...workspaces.pendingWorkspaces]));

        dispatch(workspacesActions.setSelectedWorkspace(selectedWorkspace ?? null));

        if (selectedWorkspace) {
          localStorageService.set(STORAGE_KEYS.B2B_WORKSPACE, JSON.stringify(selectedWorkspace));
          dispatch(planThunks.fetchBusinessLimitUsageThunk());
          dispatch(fetchCredentials());
          dispatch(sessionThunks.changeWorkspaceThunk());
        }
      }, 1000);
    } catch (error) {
      notificationsService.show({ text: 'Error seting up workspace', type: ToastType.Error });
    }
  },
);

const updateWorkspaceAvatar = createAsyncThunk<void, { workspaceId: string; avatar: Blob }, { state: RootState }>(
  'workspaces/updateAvatar',
  async (payload, { dispatch }) => {
    const { avatar } = await workspacesService.updateWorkspaceAvatar(payload.workspaceId, payload.avatar);

    await saveWorkspaceAvatarToDatabase(payload.workspaceId, avatar, payload.avatar);
    dispatch(workspacesActions.patchWorkspace({ workspaceId: payload.workspaceId, patch: { avatar } }));
  },
);

const deleteWorkspaceAvatar = createAsyncThunk<void, { workspaceId: string }, { state: RootState }>(
  'workspaces/deleteAvatar',
  async (payload, { dispatch }) => {
    await workspacesService.deleteWorkspaceAvatar(payload.workspaceId);

    await deleteWorkspaceAvatarFromDatabase(payload.workspaceId);
    dispatch(workspacesActions.patchWorkspace({ workspaceId: payload.workspaceId, patch: { avatar: undefined } }));
  },
);

const editWorkspace = createAsyncThunk<
  boolean,
  { workspaceId: string; details: { name?: string; description?: string; address?: string; phoneNumber?: string } },
  { state: RootState }
>('workspaces/editWorkspace', async (payload, { dispatch }) => {
  await workspacesService.editWorkspace(payload.workspaceId, payload.details);
  const workspace = await workspacesService.getWorkspace(payload.workspaceId);
  if (workspace) {
    const { name, description, address, phoneNumber } = workspace;
    dispatch(
      workspacesActions.patchWorkspace({
        workspaceId: payload.workspaceId,
        patch: { name, description, address, phoneNumber },
      }),
    );
    return true;
  }
  return false;
});

export const workspacesSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    resetState: (state: WorkspacesState) => {
      Object.assign(state, initialState);
    },
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
    patchWorkspace: (
      state: WorkspacesState,
      action: PayloadAction<{ workspaceId: string; patch: Partial<Workspace> }>,
    ) => {
      const { workspaceId, patch } = action.payload;
      state.workspaces = state.workspaces.map((item) => {
        const workspace = item.workspace;
        if (workspace.id === workspaceId) {
          item.workspace = Object.assign(workspace, patch);
          if (state.selectedWorkspace?.workspace.id === workspaceId) {
            state.selectedWorkspace = item;
            localStorageService.set(STORAGE_KEYS.B2B_WORKSPACE, JSON.stringify(item));
          }
        }
        return item;
      });
    },
    setIsLoadingCredentials: (state: WorkspacesState, action: PayloadAction<boolean>) => {
      state.isLoadingCredentials = action.payload;
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
        notificationsService.show({
          text: t('notificationMessages.errorFetchingWorkspace', {
            error: errorMsg,
          }),
          type: ToastType.Warning,
        });
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

        state.isLoadingCredentials = false;
        state.isLoadingWorkspaces = false;
        notificationsService.show({
          text: t('notificationMessages.errorFetchingWorkspaceCredentials', {
            error: errorMsg,
          }),
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
        notificationsService.show({
          text: t('notificationMessages.errorSettingUpWorkspace', { error: errorMsg }),
          type: ToastType.Warning,
        });
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
        notificationsService.show({
          text: t('notificationMessages.errorWhileLoadingWorkspace', { error: errorMsg }),
          type: ToastType.Warning,
        });
      })

      .addCase(editWorkspace.rejected, () => {
        notificationsService.show({
          text: t('views.preferences.workspace.billing.errorUpdatingBillingDetails'),
          type: ToastType.Warning,
        });
      })
      .addCase(editWorkspace.fulfilled, (_, action) => {
        const isUpdateSuccessful = action.payload;
        if (isUpdateSuccessful) {
          notificationsService.show({
            text: t('views.preferences.workspace.billing.updatedBillingDetails'),
            type: ToastType.Success,
          });
        } else {
          notificationsService.show({
            text: t('views.preferences.workspace.billing.errorUpdatingBillingDetails'),
            type: ToastType.Warning,
          });
        }
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
  updateWorkspaceAvatar,
  deleteWorkspaceAvatar,
  editWorkspace,
};

export default workspacesSlice.reducer;
