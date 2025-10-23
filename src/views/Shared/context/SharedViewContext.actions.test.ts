/**
 * @jest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import { OrderDirection } from '../../../app/core/types';
import { ActionTypes } from './SharedViewContext';
import * as actions from './SharedViewContext.actions';

describe('SharedViewContext.actions', () => {
  it('should create actions with correct type and payload', () => {
    expect(actions.setHasMoreFiles(true)).toEqual({ type: ActionTypes.SET_HAS_MORE_FILES, payload: true });
    expect(actions.setHasMoreFolders(false)).toEqual({ type: ActionTypes.SET_HAS_MORE_FOLDERS, payload: false });
    expect(actions.setPage(2)).toEqual({ type: ActionTypes.SET_PAGE, payload: 2 });
    expect(actions.setIsLoading(true)).toEqual({ type: ActionTypes.SET_IS_LOADING, payload: true });
    expect(actions.setSharedFolders([])).toEqual({ type: ActionTypes.SET_SHARE_FOLDERS, payload: [] });
    expect(actions.setSharedFiles([])).toEqual({ type: ActionTypes.SET_SHARE_FILES, payload: [] });
    expect(actions.setSelectedItems([])).toEqual({ type: ActionTypes.SET_SELECTED_ITEMS, payload: [] });
    expect(actions.setShowStopSharingConfirmation(false)).toEqual({
      type: ActionTypes.SET_STOP_SHARING_CONFIRMATION,
      payload: false,
    });
    expect(actions.setIsFileViewerOpen(true)).toEqual({ type: ActionTypes.SET_IS_FILE_VIEWER_OPEN, payload: true });
    expect(actions.setIsEditNameDialogOpen(false)).toEqual({
      type: ActionTypes.SET_IS_EDIT_NAME_DIALOG_OPEN,
      payload: false,
    });
    expect(actions.setIsDeleteDialogModalOpen(true)).toEqual({
      type: ActionTypes.SET_IS_DELETE_DIALOG_MODAL_OPEN,
      payload: true,
    });
    expect(actions.setCurrentFolderLevelResourcesToken('token1')).toEqual({
      type: ActionTypes.SET_CURRENT_FOLDER_LEVEL_RESOURCES_TOKEN,
      payload: 'token1',
    });
    expect(actions.setNextFolderLevelResourcesToken('token2')).toEqual({
      type: ActionTypes.SET_NEXT_FOLDER_LEVEL_RESOURCES_TOKEN,
      payload: 'token2',
    });
    expect(actions.setClickedShareItemEncryptionKey('key')).toEqual({
      type: ActionTypes.SET_CLICKED_SHARE_ITEM_ENCRYPTION_KEY,
      payload: 'key',
    });
    expect(actions.setCurrentFolderId('folder1')).toEqual({
      type: ActionTypes.SET_CURRENT_FOLDER_ID,
      payload: 'folder1',
    });
    expect(actions.setCurrentShareOwnerAvatar('avatar')).toEqual({
      type: ActionTypes.SET_CURRENT_SHARE_OWNER_AVATAR,
      payload: 'avatar',
    });
    expect(actions.setFilesOwnerCredentials({ networkUser: 'user', networkPass: 'pass' })).toEqual({
      type: ActionTypes.SET_FILES_OWNER_CREDENTIALS,
      payload: { networkUser: 'user', networkPass: 'pass' },
    });
    expect(actions.setOwnerBucket('bucket')).toEqual({ type: ActionTypes.SET_OWNER_BUCKET, payload: 'bucket' });
    expect(actions.setOwnerEncryptionKey('key')).toEqual({
      type: ActionTypes.SET_OWNER_ENCRYPTION_KEY,
      payload: 'key',
    });
  });

  it('should handle optional payloads', () => {
    expect(actions.setOrderBy()).toEqual({ type: ActionTypes.SET_ORDER_BY, payload: undefined });
    expect(actions.setOrderBy({ field: 'name', direction: OrderDirection.Asc })).toEqual({
      type: ActionTypes.SET_ORDER_BY,
      payload: { field: 'name', direction: OrderDirection.Asc },
    });
    expect(actions.setItemToView()).toEqual({ type: ActionTypes.SET_ITEM_TO_VIEW, payload: undefined });
    expect(actions.setEditNameItem()).toEqual({ type: ActionTypes.SET_EDIT_NAME_ITEM, payload: undefined });
    expect(actions.setClickedShareItemUser()).toEqual({
      type: ActionTypes.SET_CLICKED_SHARE_ITEM_USER,
      payload: undefined,
    });
    expect(actions.setCurrentParentFolderId()).toEqual({
      type: ActionTypes.SET_CURRENT_PARENT_FOLDER_ID,
      payload: undefined,
    });
    expect(actions.setOwnerBucket(null)).toEqual({ type: ActionTypes.SET_OWNER_BUCKET, payload: null });
    expect(actions.setOwnerEncryptionKey(null)).toEqual({ type: ActionTypes.SET_OWNER_ENCRYPTION_KEY, payload: null });
  });
});
