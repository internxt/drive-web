import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import shareService, {
  getSharedFolderInvitationsAsInvitedUser,
  getSharingRoles,
  inviteUserToSharedFolder,
} from 'app/share/services/share.service';
import { RootState } from '../..';

import { SharedFoldersInvitationsAsInvitedUserResponse } from '@internxt/sdk/dist/drive/share/types';
import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { UserRoles } from 'app/share/types';
import { t } from 'i18next';
import userService from '../../../auth/services/user.service';
import { encryptMessageWithPublicKey } from '../../../crypto/services/pgp.service';
import { Role } from './types';

export interface ShareLinksState {
  isLoadingRoles: boolean;
  roles: Role[];
  pendingInvitations: SharedFoldersInvitationsAsInvitedUserResponse[];
  currentShareId: string | null;
  currentSharingRole: UserRoles | null;
}

const initialState: ShareLinksState = {
  isLoadingRoles: false,
  roles: [],
  pendingInvitations: [],
  currentShareId: null,
  currentSharingRole: null,
};

export interface ShareFileWithUserPayload {
  itemId: string;
  itemType: 'file' | 'folder';
  notifyUser: boolean;
  notificationMessage?: string;
  sharedWith: string;
  encryptionAlgorithm: string;
  roleId: string;
  publicKey?: string;
  isNewUser?: boolean;
}

const shareItemWithUser = createAsyncThunk<string | void, ShareFileWithUserPayload, { state: RootState }>(
  'shareds/shareFileWithUser',
  async (payload: ShareFileWithUserPayload, { getState }): Promise<string | void> => {
    const rootState = getState();
    const user = rootState.user.user;
    try {
      if (!user) {
        navigationService.push(AppView.Login);
        return;
      }
      const { mnemonic } = user;

      let publicKey = payload.publicKey;

      if (payload.isNewUser && !publicKey) {
        const prCreatedUserResponse = await userService.preCreateUser(payload.sharedWith);
        publicKey = prCreatedUserResponse.publicKey;
      }

      if ((!publicKey && !payload.isNewUser) || !publicKey) {
        const publicKeyResponse = await userService.getPublicKeyByEmail(payload.sharedWith);
        publicKey = publicKeyResponse.publicKey;
      }

      const encryptedMnemonic = await encryptMessageWithPublicKey({
        message: mnemonic,
        publicKeyInBase64: publicKey,
      });

      const encryptedMnemonicInBase64 = btoa(encryptedMnemonic as string);

      await inviteUserToSharedFolder({
        itemId: payload.itemId,
        itemType: payload.itemType,
        sharedWith: payload.sharedWith,
        notifyUser: payload.notifyUser,
        notificationMessage: payload.notificationMessage,
        encryptionKey: encryptedMnemonicInBase64,
        encryptionAlgorithm: payload.encryptionAlgorithm,
        roleId: payload.roleId,
        persistPreviousSharing: true,
      });

      notificationsService.show({
        text: t('modals.shareModal.invite.successSentInvitation', { email: payload.sharedWith }),
        type: ToastType.Success,
      });
    } catch (err: unknown) {
      const castedError = errorService.castError(err);
      errorService.reportError(err, { extra: { thunk: 'shareFileWithUser', email: payload.sharedWith } });
      if (castedError.message === 'unauthenticated') {
        return navigationService.push(AppView.Login);
      }
      notificationsService.show({
        text: t('modals.shareModal.invite.error.errorInviting', { email: payload.sharedWith }),
        type: ToastType.Error,
      });
    }
  },
);

interface StopSharingItemPayload {
  itemType: string;
  itemId: string;
  itemName: string;
}

export const stopSharingItem = createAsyncThunk<void, StopSharingItemPayload, { state: RootState }>(
  'shareds/stopSharingItem',
  async ({ itemType, itemId, itemName }: StopSharingItemPayload) => {
    try {
      await shareService.stopSharingItem(itemType, itemId);

      notificationsService.show({
        text: t('modals.shareModal.stopSharing.notification.success', {
          name: itemName,
        }),
        type: ToastType.Success,
      });
      return;
    } catch (error) {
      errorService.reportError(error);
    }

    notificationsService.show({
      text: t('modals.shareModal.stopSharing.notification.error'),
      type: ToastType.Error,
    });
  },
);

interface RemoveUserFromSharedFolderPayload {
  userEmail: string;
  itemType: string;
  itemId: string;
  userId: string;
}

export const removeUserFromSharedFolder = createAsyncThunk<
  boolean,
  RemoveUserFromSharedFolderPayload,
  { state: RootState }
>('shareds/stopSharingFolder', async ({ userEmail, itemType, itemId, userId }: RemoveUserFromSharedFolderPayload) => {
  try {
    await shareService.removeUserRole({ itemType, itemId, userId });

    notificationsService.show({
      text: t('modals.shareModal.removeUser.notification.success', { name: userEmail }),
      type: ToastType.Success,
    });
    return true;
  } catch (error) {
    errorService.reportError(error);
  }

  notificationsService.show({
    text: t('modals.shareModal.removeUser.notification.error', { name: userEmail }),
    type: ToastType.Error,
  });
  return false;
});

const getSharedFolderRoles = createAsyncThunk<string | void, void, { state: RootState }>(
  'shareds/getRoles',
  async (_, { dispatch }): Promise<string | void> => {
    try {
      const newRoles = await getSharingRoles();

      if (newRoles.length > 0) {
        dispatch(sharedActions.setSharedFolderUserRoles(newRoles));
      }
    } catch (err: unknown) {
      errorService.reportError(err, { extra: { thunk: 'getSharedFolderRoles' } });
    }
  },
);

// Get pending invitations
const getPendingInvitations = createAsyncThunk<string | void, void, { state: RootState }>(
  'shareds/getPendingInvitations',
  async (_, { dispatch }): Promise<string | void> => {
    try {
      const pendingInvitations = await getSharedFolderInvitationsAsInvitedUser({});

      dispatch(sharedActions.setPendingInvitations(pendingInvitations.invites));
    } catch (err: unknown) {
      errorService.reportError(err, { extra: { thunk: 'getPendingInvitations' } });
    }
  },
);

export const sharedSlice = createSlice({
  name: 'shared',
  initialState,
  reducers: {
    setSharedFolderUserRoles: (state: ShareLinksState, action: PayloadAction<Role[]>) => {
      state.roles = action.payload;
    },
    setPendingInvitations: (state: ShareLinksState, action: PayloadAction<any>) => {
      state.pendingInvitations = action.payload;
    },
    setCurrentShareId: (state: ShareLinksState, action: PayloadAction<any>) => {
      state.currentShareId = action.payload;
    },
    setCurrentSharingRole: (state: ShareLinksState, action: PayloadAction<any>) => {
      state.currentSharingRole = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getSharedFolderRoles.pending, (state) => {
        state.isLoadingRoles = true;
      })
      .addCase(getSharedFolderRoles.fulfilled, (state) => {
        state.isLoadingRoles = false;
      })
      .addCase(getSharedFolderRoles.rejected, (state) => {
        state.isLoadingRoles = false;
      })
      .addCase(getPendingInvitations.pending, (state) => {
        state.isLoadingRoles = true;
      })
      .addCase(getPendingInvitations.fulfilled, (state) => {
        state.isLoadingRoles = false;
      })
      .addCase(getPendingInvitations.rejected, (state) => {
        state.isLoadingRoles = false;
      });
  },
});

export const sharedSelectors = {
  getSharedFolderUserRoles(state: RootState): Role[] {
    const { roles } = state.shared;
    return roles;
  },
};

export const sharedActions = sharedSlice.actions;

export const sharedThunks = {
  shareItemWithUser,
  stopSharingItem,
  removeUserFromSharedFolder,
  getSharedFolderRoles,
  getPendingInvitations,
};

export default sharedSlice.reducer;
