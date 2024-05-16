import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import shareService, {
  decryptMnemonic,
  getSharedFolderInvitationsAsInvitedUser,
  getSharingRoles,
  inviteUserToSharedFolder,
} from 'app/share/services/share.service';
import { RootState } from '../..';

import { aes } from '@internxt/lib';
import { SharedFoldersInvitationsAsInvitedUserResponse, SharingMeta } from '@internxt/sdk/dist/drive/share/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { UserRoles } from 'app/share/types';
import copy from 'copy-to-clipboard';
import crypto from 'crypto';
import { t } from 'i18next';
import userService from '../../../auth/services/user.service';
import { HTTP_CODES, PAYMENT_REQUIRED_ERROR_CODES } from '../../../core/services/http.service';
import localStorageService from '../../../core/services/local-storage.service';
import { encryptMessageWithPublicKey } from '../../../crypto/services/pgp.service';
import { uiActions } from '../ui';
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
  async (payload: ShareFileWithUserPayload, { getState, dispatch }): Promise<string | void> => {
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
    } catch (error: unknown) {
      const castedError = errorService.castError(error);

      if (castedError.message === 'unauthenticated') {
        return navigationService.push(AppView.Login);
      } else if (castedError.status === HTTP_CODES.PAYMENT_REQUIRED) {
        switch (castedError.code) {
          case PAYMENT_REQUIRED_ERROR_CODES.MAX_SHARED_ITEMS:
            dispatch(uiActions.setIsShareItemsLimitDialogOpen(true));
            break;
          case PAYMENT_REQUIRED_ERROR_CODES.MAX_SHARED_INVITES:
            dispatch(uiActions.setIsShareItemInvitationsLimitDialogOpen(true));
            break;
        }
      } else {
        errorService.reportError(error, { extra: { thunk: 'shareFileWithUser', email: payload.sharedWith } });
        notificationsService.show({
          text: t('modals.shareModal.invite.error.errorInviting', { email: payload.sharedWith }),
          type: ToastType.Error,
        });
      }
    }
  },
);
type PublicShareLinkPayload = { itemUUid: string; itemType: 'folder' | 'file'; encriptedMnemonic?: string };

export const getPublicShareLink = createAsyncThunk<
  Promise<void | SharingMeta>,
  PublicShareLinkPayload,
  { state: RootState }
>(
  'shareds/getPublicShareLink',
  async ({ itemType, itemUUid, encriptedMnemonic }: PublicShareLinkPayload, { dispatch }) => {
    try {
      const user = localStorageService.getUser() as UserSettings;
      let { mnemonic } = user;
      const code = crypto.randomBytes(32).toString('hex');

      const publicSharingItemData = await shareService.getPublicShareLink(itemUUid, itemType);
      const { id: sharingId, encryptedCode: encryptedCodeFromResponse } = publicSharingItemData;
      const isUserInvited = publicSharingItemData.ownerId !== user.uuid;

      if (isUserInvited && encriptedMnemonic) {
        const ownerMnemonic = await decryptMnemonic(encriptedMnemonic);
        if (ownerMnemonic) mnemonic = ownerMnemonic;
      }
      const plainCode = encryptedCodeFromResponse ? aes.decrypt(encryptedCodeFromResponse, mnemonic) : code;

      window.focus();
      const publicShareLink = `${process.env.REACT_APP_HOSTNAME}/sh/${itemType}/${sharingId}/${plainCode}`;
      // workaround to enable copy after login, because first copy always fails
      copy(publicShareLink);
      const isCopied = copy(publicShareLink);
      if (!isCopied) throw Error('Error copying shared public link');

      notificationsService.show({ text: t('shared-links.toast.copy-to-clipboard'), type: ToastType.Success });
      return publicSharingItemData;
    } catch (error) {
      const castedError = errorService.castError(error);
      if (castedError.message === 'unauthenticated') {
        return navigationService.push(AppView.Login);
      } else if (castedError.status === HTTP_CODES.PAYMENT_REQUIRED) {
        dispatch(uiActions.setIsShareItemsLimitDialogOpen(true));
      } else
        notificationsService.show({
          text: t('modals.shareModal.errors.copy-to-clipboard'),
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
  getPublicShareLink,
};

export default sharedSlice.reducer;
