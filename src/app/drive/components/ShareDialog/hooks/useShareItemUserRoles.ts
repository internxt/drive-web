import shareService from 'app/share/services/share.service';
import {
  setAccessMode,
  setInvitedUsers,
  setIsLoading,
  setIsPasswordProtected,
  setIsRestrictedSharingDialogOpen,
  setSelectedUserListIndex,
  setSharingMeta,
} from '../context/ShareDialogContext.actions';
import { AccessMode, UserRole } from '../types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useShareDialogContext } from '../context';
import { ItemToShare } from 'app/store/slices/storage/types';
import errorService from 'services/error.service';

interface ShareItemUserRolesProps {
  isRestrictedSharingAvailable: boolean;
  itemToShare: ItemToShare | null;
}

export const useShareItemUserRoles = ({ isRestrictedSharingAvailable, itemToShare }: ShareItemUserRolesProps) => {
  const { translate } = useTranslationContext();
  const { state, dispatch: actionDispatch } = useShareDialogContext();

  const { accessMode, roles, invitedUsers } = state;

  const changeAccess = async (mode: AccessMode) => {
    actionDispatch(setSelectedUserListIndex(null));

    if (!isRestrictedSharingAvailable) {
      actionDispatch(setIsRestrictedSharingDialogOpen(true));
      return;
    }

    if (mode != accessMode) {
      actionDispatch(setIsLoading(true));
      try {
        const sharingType = mode === 'restricted' ? 'private' : 'public';
        const itemType = itemToShare?.item.isFolder ? 'folder' : 'file';
        const itemId = itemToShare?.item.uuid ?? '';

        await shareService.updateSharingType(itemId, itemType, sharingType);

        if (sharingType === 'public') {
          const shareInfo = await shareService.createPublicShareFromOwnerUser(itemId, itemType);
          actionDispatch(setSharingMeta(shareInfo));
          actionDispatch(setIsPasswordProtected(false));
        }

        actionDispatch(setAccessMode(mode));
      } catch (error) {
        errorService.reportError(error);
        notificationsService.show({
          text: translate('modals.shareModal.errors.update-sharing-access'),
          type: ToastType.Error,
        });
      }
      actionDispatch(setIsLoading(false));
    }
  };

  const handleUserRoleChange = async (email: string, roleName: string) => {
    try {
      actionDispatch(setSelectedUserListIndex(null));
      const roleId = roles.find((role) => role.name.toLowerCase() === roleName.toLowerCase())?.id;
      const sharingId = invitedUsers.find((invitedUser) => invitedUser.email === email)?.sharingId;

      if (roleId && sharingId) {
        await shareService.updateUserRoleOfSharedFolder({
          sharingId: sharingId,
          newRoleId: roleId,
        });

        const modifiedInvitedUsers = invitedUsers.map((invitedUser) => {
          if (invitedUser.email === email) {
            return { ...invitedUser, roleId, roleName: roleName as UserRole };
          }
          return invitedUser;
        });
        actionDispatch(setInvitedUsers(modifiedInvitedUsers));
      }
    } catch (error) {
      errorService.reportError(error);
      notificationsService.show({ text: translate('modals.shareModal.errors.updatingRole'), type: ToastType.Error });
    }
  };

  return {
    changeAccess,
    handleUserRoleChange,
  };
};
