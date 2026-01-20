import shareService from 'app/share/services/share.service';
import { useCallback } from 'react';
import {
  setAccessRequests,
  setInvitedUsers,
  setSelectedUserListIndex,
  setView,
} from '../context/ShareDialogContext.actions';
import { getLocalUserData } from '../utils';
import { useShareDialogContext } from '../context';
import { REQUEST_STATUS, UserRole } from '../types';

export const useShareItemInvitations = ({ itemToShare, isUserOwner }) => {
  const { state, dispatch: actionDispatch } = useShareDialogContext();

  const { roles, accessRequests } = state;

  const getAndUpdateInvitedUsers = useCallback(async () => {
    if (!itemToShare?.item) return;

    try {
      const invitedUsersList = await shareService.getUsersOfSharedFolder({
        itemType: itemToShare.item.isFolder ? 'folder' : 'file',
        folderId: itemToShare.item.uuid,
      });

      const invitedUsersListParsed = invitedUsersList['users'].map((user) => ({
        ...user,
        roleName: roles.find((role) => role.id === user.role.id)?.name.toLowerCase(),
      }));

      actionDispatch(setInvitedUsers(invitedUsersListParsed));
    } catch {
      // the server throws an error when there are no users with shared item,
      // that means that the local user is the owner as there is nobody else with this shared file.
      if (isUserOwner) {
        const ownerData = getLocalUserData();
        actionDispatch(setInvitedUsers([{ ...ownerData, roleName: 'owner' }]));
      }
    }
  }, [itemToShare, roles, isUserOwner, actionDispatch]);

  const onAcceptRequest = (email: string, roleName: UserRole) => {
    // TODO -> Accept user access request
    const modifiedAccessRequests = accessRequests.map((request) => {
      if (request.email === email) {
        return { ...request, status: REQUEST_STATUS.ACCEPTED };
      }
      return request;
    });

    actionDispatch(setAccessRequests(modifiedAccessRequests));
  };

  const handleDenyRequest = (email: string) => {
    const deniedRequests = accessRequests.map((request) => {
      if (request.email === email) {
        return { ...request, status: REQUEST_STATUS.DENIED };
      }
      return request;
    });

    actionDispatch(setAccessRequests(deniedRequests));
  };

  const onInviteUser = () => {
    actionDispatch(setView('invite'));
    actionDispatch(setSelectedUserListIndex(null));
  };

  return {
    getAndUpdateInvitedUsers,
    onAcceptRequest,
    handleDenyRequest,
    onInviteUser,
  };
};
