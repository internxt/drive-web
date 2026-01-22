/**
 * @jest-environment jsdom
 */

import { describe, expect, test } from 'vitest';
import { ActionTypes } from './ShareDialogContext';
import * as actions from './ShareDialogContext.actions';

describe('Actions for Share Dialog', () => {
  test('When the action is saved, then the state is updated correctly', () => {
    expect(actions.setView('general')).toEqual({ type: ActionTypes.SET_VIEW, payload: 'general' });
    expect(actions.setIsLoading(true)).toEqual({ type: ActionTypes.SET_IS_LOADING, payload: true });
    expect(actions.setRoles([{ id: '1', name: 'Admin' }])).toEqual({
      type: ActionTypes.SET_ROLES,
      payload: [{ id: '1', name: 'Admin' }],
    });
    expect(actions.setInviteDialogRoles([{ id: '2', name: 'Editor' }])).toEqual({
      type: ActionTypes.SET_INVITE_DIALOG_ROLES,
      payload: [{ id: '2', name: 'Editor' }],
    });
    expect(actions.setAccessMode('public')).toEqual({ type: ActionTypes.SET_ACCESS_MODE, payload: 'public' });
    expect(actions.setIsPasswordProtected(true)).toEqual({
      type: ActionTypes.SET_IS_PASSWORD_PROTECTED,
      payload: true,
    });
    expect(actions.setInvitedUsers([])).toEqual({
      type: ActionTypes.SET_INVITED_USERS,
      payload: [],
    });
    expect(
      actions.setInvitedUsers([
        {
          avatar: null,
          name: 'John',
          lastname: 'Doe',
          email: 'john@example.com',
          roleName: 'reader',
          uuid: 'user-123',
          sharingId: 'share-456',
        },
      ]),
    ).toEqual({
      type: ActionTypes.SET_INVITED_USERS,
      payload: [
        {
          avatar: null,
          name: 'John',
          lastname: 'Doe',
          email: 'john@example.com',
          roleName: 'reader',
          uuid: 'user-123',
          sharingId: 'share-456',
        },
      ],
    });
    expect(actions.setCurrentUserFolderRole('owner')).toEqual({
      type: ActionTypes.SET_CURRENT_USER_FOLDER_ROLE,
      payload: 'owner',
    });
    expect(actions.updateUserRole({ email: 'user@example.com', roleId: '1', roleName: 'editor' })).toEqual({
      type: ActionTypes.UPDATE_USER_ROLE,
      payload: { email: 'user@example.com', roleId: '1', roleName: 'editor' },
    });
    expect(actions.removeUser('user@example.com')).toEqual({
      type: ActionTypes.REMOVE_USER,
      payload: 'user@example.com',
    });
    expect(actions.updateRequestStatus({ email: 'user@example.com', status: 'accepted' })).toEqual({
      type: ActionTypes.UPDATE_REQUEST_STATUS,
      payload: { email: 'user@example.com', status: 'accepted' },
    });
    expect(actions.setSelectedUserListIndex(2)).toEqual({
      type: ActionTypes.SET_SELECTED_USER_LIST_INDEX,
      payload: 2,
    });
    expect(
      actions.setUserOptionsEmail({
        avatar: null,
        name: 'Jane',
        lastname: 'Smith',
        email: 'jane@example.com',
        roleName: 'editor',
        uuid: 'user-789',
        sharingId: 'share-101',
      }),
    ).toEqual({
      type: ActionTypes.SET_USER_OPTIONS_EMAIL,
      payload: {
        avatar: null,
        name: 'Jane',
        lastname: 'Smith',
        email: 'jane@example.com',
        roleName: 'editor',
        uuid: 'user-789',
        sharingId: 'share-101',
      },
    });
    expect(actions.setUserOptionsY(150)).toEqual({ type: ActionTypes.SET_USER_OPTIONS_Y, payload: 150 });
    expect(actions.setShowStopSharingConfirmation(true)).toEqual({
      type: ActionTypes.SET_SHOW_STOP_SHARING_CONFIRMATION,
      payload: true,
    });
    expect(actions.setOpenPasswordInput(true)).toEqual({ type: ActionTypes.SET_OPEN_PASSWORD_INPUT, payload: true });
    expect(actions.setOpenPasswordDisableDialog(false)).toEqual({
      type: ActionTypes.SET_OPEN_PASSWORD_DISABLE_DIALOG,
      payload: false,
    });
    expect(actions.setIsRestrictedSharingDialogOpen(true)).toEqual({
      type: ActionTypes.SET_IS_RESTRICTED_SHARING_DIALOG_OPEN,
      payload: true,
    });
    expect(actions.setIsRestrictedPasswordDialogOpen(false)).toEqual({
      type: ActionTypes.SET_IS_RESTRICTED_PASSWORD_DIALOG_OPEN,
      payload: false,
    });
  });
});
