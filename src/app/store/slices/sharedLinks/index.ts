import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import shareService from 'app/share/services/share.service';
import { RootState } from '../..';

import { ListShareLinksItem, ListShareLinksResponse } from '@internxt/sdk/dist/drive/share/types'; //import { ShareLink } from '../../../shareLinks/types';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { trackShareLinkBucketIdUndefined } from 'app/analytics/services/analytics.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { userThunks } from '../user';
import i18n from 'app/i18n/services/i18n.service';
import { aes } from '@internxt/lib';
import crypto from 'crypto';
import { Environment } from '@internxt/inxt-js';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import errorService from 'app/core/services/error.service';
import { DriveItemData } from 'app/drive/types';
import storageThunks from '../storage/storage.thunks';
import { storageSelectors } from '../storage';
import { string } from 'prop-types';

export interface ShareLinksState {
  isLoadingGeneratingLink: boolean;
  isLoadingShareds: boolean;
  sharedLinks: ListShareLinksItem[] | []; //ShareLink[];
  pagination: {
    page: number;
    perPage: number;
    //totalItems: number;
  };
}

const initialState: ShareLinksState = {
  isLoadingGeneratingLink: false,
  isLoadingShareds: false,
  sharedLinks: [],
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
        notificationsService.show({ text: i18n.get('error.shareLinkMissingBucket'), type: ToastType.Error });
        dispatch(userThunks.logoutThunk());

        return;
      }

      const code = crypto.randomBytes(32).toString('hex');

      const encryptedMnemonic = aes.encrypt(mnemonic, code);
      const encryptedCode = aes.encrypt(code, mnemonic);

      const item = payload.item;
      console.log('item', item);
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

      const link = await shareService.createShareLink(code, mnemonic, requestPayload);
      navigator.clipboard.writeText(link);
      notificationsService.show({ text: 'Share link copied to clipboard', type: ToastType.Success });

      // Refresh currentFolder so that the new icon appears:
      const currentFolderId = storageSelectors.currentFolderId(rootState);
      dispatch(storageThunks.fetchFolderContentThunk(currentFolderId));

      return link;
      // dispatch(referralsThunks.refreshUserReferrals());

      // window.analytics.track('file-share');
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
}

export const deleteLinkThunk = createAsyncThunk<void, DeleteLinkPayload, { state: RootState }>(
  'shareds/deleteLink',
  async (payload: DeleteLinkPayload, { dispatch, getState }) => {
    await shareService.deleteShareLink(payload.linkId);

    // Refresh currentFolder so that the share icon does not appear:
    const currentFolderId = storageSelectors.currentFolderId(getState());
    dispatch(storageThunks.fetchFolderContentThunk(currentFolderId));

    const stringLinksDeleted = i18n.get('shared-links.toast.link-deleted');
    notificationsService.show({ text: stringLinksDeleted, type: ToastType.Success });
  },
);

export const sharedSlice = createSlice({
  name: 'shared',
  initialState,
  reducers: {},
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
      });
  },
});

export const sharedSelectors = {};

export const sharedActions = sharedSlice.actions;

export const sharedThunks = {
  fetchSharedLinksThunk,
  getSharedLinkThunk,
  deleteLinkThunk,
};

export default sharedSlice.reducer;
