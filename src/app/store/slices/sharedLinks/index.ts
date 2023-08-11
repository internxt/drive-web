import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import shareService, { sharePrivateFolderWithUser } from 'app/share/services/share.service';
import { RootState } from '../..';

import { ListShareLinksItem, ListShareLinksResponse, ShareLink } from '@internxt/sdk/dist/drive/share/types';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { trackShareLinkBucketIdUndefined } from 'app/analytics/services/analytics.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { userThunks } from '../user';
import { aes } from '@internxt/lib';
import crypto from 'crypto';
import { Environment } from '@internxt/inxt-js';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import errorService from 'app/core/services/error.service';
import { DriveItemData } from 'app/drive/types';
import { storageActions } from '../storage';
import { t } from 'i18next';
import userService from '../../../auth/services/user.service';
import { encryptMessageWithPublicKey } from '../../../crypto/services/pgp.service';
import { Role } from './types';
import { parseRolesFromBackend } from './utils';

export interface ShareLinksState {
  isLoadingGeneratingLink: boolean;
  isLoadingShareds: boolean;
  isSharingKey: boolean;
  sharedLinks: ListShareLinksItem[] | []; //ShareLink[];
  isLoadingRoles: boolean;
  roles: Role[];
  pagination: {
    page: number;
    perPage: number;
    //totalItems: number;
  };
}

const initialState: ShareLinksState = {
  isLoadingGeneratingLink: false,
  isLoadingShareds: false,
  isSharingKey: false,
  sharedLinks: [],
  isLoadingRoles: false,
  roles: [],
  pagination: {
    page: 1,
    perPage: 50,
    //totalItems: 0,
  },
};

export const fetchSharedLinksThunk = createAsyncThunk<ListShareLinksResponse, void, { state: RootState }>(
  'shareds/fetchSharedLinks',
  async (_, { getState }) => {
    const state = getState();
    const page = state.shared.pagination.page;
    const perPage = state.shared.pagination.perPage;
    const response = await shareService.getAllShareLinks(page, perPage, undefined);
    return response;
  },
);

interface GetLinkPayload {
  item: DriveItemData;
}

const getSharedLinkThunk = createAsyncThunk<string | void, GetLinkPayload, { state: RootState }>(
  'shareds/getLink',
  async (payload: GetLinkPayload, { dispatch, getState }): Promise<string | void> => {
    const rootState = getState();
    const user = rootState.user.user;
    try {
      if (!user) {
        navigationService.push(AppView.Login);
        return;
      }

      const { bucket, bridgeUser, userId, mnemonic } = user;

      if (!bucket) {
        trackShareLinkBucketIdUndefined({ email: bridgeUser });
        // close();
        notificationsService.show({ text: t('error.shareLinkMissingBucket'), type: ToastType.Error });
        dispatch(userThunks.logoutThunk());

        return;
      }

      const code = crypto.randomBytes(32).toString('hex');

      const encryptedMnemonic = aes.encrypt(mnemonic, code);
      const encryptedCode = aes.encrypt(code, mnemonic);

      const item = payload.item;
      const requestPayload: ShareTypes.GenerateShareLinkPayload = {
        itemId: item.id.toString(),
        type: item.isFolder ? 'folder' : 'file',
        bucket: bucket,
        itemToken: await new Environment({
          bridgePass: userId,
          bridgeUser,
          bridgeUrl: process.env.REACT_APP_STORJ_BRIDGE,
        }).createFileToken(bucket, item.fileId, 'PULL'),
        encryptedMnemonic,
        encryptedCode,
        timesValid: -1,
      };

      const share = await shareService.createShare(requestPayload);
      const link = shareService.getLinkFromShare(share, code, mnemonic, requestPayload.type);
      navigator.clipboard.writeText(link);
      notificationsService.show({ text: t('notificationMessages.copyLink'), type: ToastType.Success });

      const coercedShareLink: unknown = { ...share, isFolder: item.isFolder };
      dispatch(
        storageActions.patchItem({
          id: item.id,
          folderId: item.isFolder ? item.parentId : item.folderId,
          isFolder: item.isFolder,
          patch: {
            // The objective of the following array is for it to be non-empty, as it signals that the item has been shared, and so we can display the icon of a shared file/folder:
            shares: [coercedShareLink as ShareLink],
          },
        }),
      );

      return link;
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      if (castedError.message === 'unauthenticated') {
        return navigationService.push(AppView.Login);
      }
      notificationsService.show({ text: castedError.message, type: ToastType.Error });
    }
  },
);

interface DeleteLinkPayload {
  linkId: string;
  item: DriveItemData;
}

export const deleteLinkThunk = createAsyncThunk<void, DeleteLinkPayload, { state: RootState }>(
  'shareds/deleteLink',
  async (payload: DeleteLinkPayload, { dispatch, getState }) => {
    const { linkId, item } = payload;
    await shareService.deleteShareLink(linkId);

    dispatch(
      storageActions.patchItem({
        id: item.id,
        folderId: item.isFolder ? item.parentId : item.folderId,
        isFolder: item.isFolder,
        patch: {
          // The objective of the following array is for it to be empty, as it signals that the item share has been removed, and so we can hide the icon of a shared file/folder:
          shares: [],
        },
      }),
    );

    const stringLinksDeleted = t('shared-links.toast.link-deleted');
    notificationsService.show({ text: stringLinksDeleted, type: ToastType.Success });
  },
);

export interface ShareFileWithUserPayload {
  email: string;
  folderUUID: string;
  roleId: string;
}

const shareFileWithUser = createAsyncThunk<string | void, ShareFileWithUserPayload, { state: RootState }>(
  'shareds/shareFileWithUser',
  async (payload: ShareFileWithUserPayload, { dispatch, getState }): Promise<string | void> => {
    const rootState = getState();
    const user = rootState.user.user;
    try {
      if (!user) {
        navigationService.push(AppView.Login);
        return;
      }
      const { mnemonic } = user;

      const publicKeyResponse = await userService.getPublicKeyByEmail(payload.email);
      const publicKey = publicKeyResponse.publicKey;

      const encryptedMnemonic = await encryptMessageWithPublicKey({
        message: mnemonic,
        publicKeyInBase64: publicKey,
      });

      await sharePrivateFolderWithUser({
        emailToShare: payload.email,
        encryptionKey: encryptedMnemonic as string,
        privateFolderId: payload.folderUUID,
        roleId: payload.roleId,
      });

      notificationsService.show({
        text: t('modals.shareModal.invite.successSentInvitation', { email: payload.email }),
        type: ToastType.Success,
      });
    } catch (err: unknown) {
      const castedError = errorService.castError(err);
      errorService.reportError(err, { extra: { thunk: 'shareFileWithUser', email: payload.email } });
      if (castedError.message === 'unauthenticated') {
        return navigationService.push(AppView.Login);
      }
      notificationsService.show({
        text: t('modals.shareModal.invite.error.errorInviting', { email: payload.email }),
        type: ToastType.Error,
      });
    }
  },
);

const getSharedFolderRoles = createAsyncThunk<string | void, void, { state: RootState }>(
  'shareds/getRoles',
  async (_, { dispatch }): Promise<string | void> => {
    try {
      const newRoles = await shareService.getPrivateSharingRoles();

      if (newRoles.roles.length > 0) {
        const parsedRoles = parseRolesFromBackend(newRoles.roles);
        dispatch(sharedActions.setSharedFolderUserRoles(parsedRoles));
      }
    } catch (err: unknown) {
      errorService.reportError(err, { extra: { thunk: 'getSharedFolderRoles' } });
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSharedLinksThunk.pending, (state) => {
        state.isLoadingShareds = true;
      })
      .addCase(fetchSharedLinksThunk.fulfilled, (state, action) => {
        state.isLoadingShareds = false;
        state.sharedLinks = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchSharedLinksThunk.rejected, (state) => {
        state.isLoadingShareds = false;
      })
      .addCase(getSharedLinkThunk.pending, (state) => {
        state.isLoadingGeneratingLink = true;
      })
      .addCase(getSharedLinkThunk.fulfilled, (state) => {
        state.isLoadingGeneratingLink = false;
      })
      .addCase(getSharedLinkThunk.rejected, (state) => {
        state.isLoadingGeneratingLink = false;
      })
      .addCase(shareFileWithUser.pending, (state) => {
        state.isSharingKey = true;
      })
      .addCase(shareFileWithUser.fulfilled, (state) => {
        state.isSharingKey = false;
      })
      .addCase(shareFileWithUser.rejected, (state) => {
        state.isSharingKey = false;
      })
      .addCase(getSharedFolderRoles.pending, (state) => {
        state.isLoadingRoles = true;
      })
      .addCase(getSharedFolderRoles.fulfilled, (state) => {
        state.isLoadingRoles = false;
      })
      .addCase(getSharedFolderRoles.rejected, (state) => {
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
  fetchSharedLinksThunk,
  getSharedLinkThunk,
  deleteLinkThunk,
  shareFileWithUser,
  getSharedFolderRoles,
};

export default sharedSlice.reducer;
