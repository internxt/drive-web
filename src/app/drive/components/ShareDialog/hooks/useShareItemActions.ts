import { useCallback } from 'react';
import { useShareDialogContext } from '../context/ShareDialogContextProvider';
import {
  removeUser,
  setIsLoading,
  setIsPasswordProtected,
  setIsRestrictedPasswordDialogOpen,
  setOpenPasswordDisableDialog,
  setOpenPasswordInput,
  setSelectedUserListIndex,
  setSharingMeta,
  setShowStopSharingConfirmation,
} from '../context/ShareDialogContext.actions';
import { cropSharedName, isAdvancedShareItem } from '../utils';
import { sharedThunks } from 'app/store/slices/sharedLinks';
import { ItemToShare } from 'app/store/slices/storage/types';
import shareService from 'app/share/services/share.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { InvitedUserProps } from '../types';
import errorService from 'services/error.service';
import envService from 'services/env.service';
import { copyTextToClipboard } from 'utils/copyToClipboard.utils';

interface ShareItemActionsProps {
  itemToShare: ItemToShare | null;
  isPasswordSharingAvailable: boolean;
  dispatch: any;
  onClose: () => void;
  onShareItem?: () => void;
  onStopSharingItem?: () => void;
}

export const useShareItemActions = ({
  itemToShare,
  isPasswordSharingAvailable,
  dispatch,
  ...props
}: ShareItemActionsProps) => {
  const { translate } = useTranslationContext();
  const { state, dispatch: actionDispatch } = useShareDialogContext();

  const { accessMode, sharingMeta, isPasswordProtected } = state;

  const getPrivateShareLink = async () => {
    try {
      await copyTextToClipboard(`${envService.getVariable('hostname')}/shared/?folderuuid=${itemToShare?.item.uuid}`);
      notificationsService.show({ text: translate('shared-links.toast.copy-to-clipboard'), type: ToastType.Success });
    } catch {
      notificationsService.show({
        text: translate('modals.shareModal.errors.copy-to-clipboard'),
        type: ToastType.Error,
      });
    }
  };

  const onCopyLink = async (): Promise<void> => {
    if (accessMode === 'restricted') {
      await getPrivateShareLink();
      actionDispatch(setSelectedUserListIndex(null));
      return;
    }

    if (itemToShare?.item.uuid) {
      const encryptionKey = isAdvancedShareItem(itemToShare.item) ? itemToShare?.item?.encryptionKey : undefined;
      const sharingInfo = await shareService.getPublicShareLink(
        itemToShare?.item.uuid,
        itemToShare.item.isFolder ? 'folder' : 'file',
        encryptionKey,
      );

      if (sharingInfo) {
        actionDispatch(setSharingMeta(sharingInfo));
      }

      props.onShareItem?.();
      actionDispatch(setSelectedUserListIndex(null));
    }
  };

  const onPasswordCheckboxChange = useCallback(() => {
    if (!isPasswordSharingAvailable) {
      actionDispatch(setIsRestrictedPasswordDialogOpen(true));
      return;
    }

    if (isPasswordProtected) {
      actionDispatch(setOpenPasswordDisableDialog(true));
    } else {
      actionDispatch(setOpenPasswordInput(true));
    }
  }, [isPasswordProtected, isPasswordSharingAvailable]);

  const onSavePublicSharePassword = useCallback(
    async (plainPassword: string) => {
      try {
        let sharingInfo = sharingMeta;

        if (sharingInfo?.encryptedCode) {
          await shareService.saveSharingPassword(sharingInfo.id, plainPassword, sharingInfo.encryptedCode);
        } else {
          const itemType = itemToShare?.item.isFolder ? 'folder' : 'file';
          const itemId = itemToShare?.item.uuid ?? '';
          sharingInfo = await shareService.createPublicShareFromOwnerUser(itemId, itemType, plainPassword);
          actionDispatch(setSharingMeta(sharingInfo));
        }

        actionDispatch(setIsPasswordProtected(true));
        props.onShareItem?.();
      } catch (error) {
        errorService.castError(error);
      } finally {
        actionDispatch(setOpenPasswordInput(false));
      }
    },
    [sharingMeta, itemToShare],
  );

  const onDisablePassword = useCallback(async () => {
    try {
      if (sharingMeta) {
        await shareService.removeSharingPassword(sharingMeta.id);
        actionDispatch(setIsPasswordProtected(false));
      }
    } catch (error) {
      errorService.castError(error);
    } finally {
      actionDispatch(setOpenPasswordDisableDialog(false));
    }
  }, [sharingMeta]);

  const onStopSharing = async () => {
    actionDispatch(setIsLoading(true));
    const itemName = cropSharedName(itemToShare?.item.name as string);
    await dispatch(
      sharedThunks.stopSharingItem({
        itemType: itemToShare?.item.isFolder ? 'folder' : 'file',
        itemId: itemToShare?.item.uuid as string,
        itemName,
      }),
    );
    props.onShareItem?.();
    props.onStopSharingItem?.();
    actionDispatch(setShowStopSharingConfirmation(false));
    props.onClose();
    setIsLoading(false);
  };

  const onRemoveUser = async (user: InvitedUserProps) => {
    if (user) {
      const hasBeenRemoved = await dispatch(
        sharedThunks.removeUserFromSharedFolder({
          itemType: itemToShare?.item.isFolder ? 'folder' : 'file',
          itemId: itemToShare?.item.uuid as string,
          userId: user.uuid,
          userEmail: user.email,
        }),
      );

      if (hasBeenRemoved.payload) {
        actionDispatch(removeUser(user.uuid));
      }
    }
    props.onClose();
  };

  return {
    onPasswordCheckboxChange,
    onSavePublicSharePassword,
    onDisablePassword,
    onCopyLink,
    onStopSharing,
    getPrivateShareLink,
    onRemoveUser,
  };
};
