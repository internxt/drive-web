import { useCallback } from 'react';
import shareService from 'app/share/services/share.service';
import { setInvitedUsers, setSelectedUserListIndex, setView } from '../context/ShareDialogContext.actions';
import { getLocalUserData } from '../utils';
import { useShareDialogContext } from '../context';
import { ItemToShare } from 'app/store/slices/storage/types';

interface ShareItemInvitationsProps {
  itemToShare: ItemToShare | null;
  isUserOwner: boolean;
}

export const useShareItemInvitations = ({ itemToShare, isUserOwner }: ShareItemInvitationsProps) => {
  const { state, dispatch: actionDispatch } = useShareDialogContext();

  const { roles } = state;

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

  const onInviteUser = () => {
    actionDispatch(setView('invite'));
    actionDispatch(setSelectedUserListIndex(null));
  };

  return {
    onInviteUser,
    getAndUpdateInvitedUsers,
  };
};
