import { aes, stringUtils } from '@internxt/lib';
import { AcceptInvitationToSharedFolderPayload } from '@internxt/sdk/dist/drive/share/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import shareService from 'app/share/services/share.service';
import { useAppDispatch } from 'app/store/hooks';
import { sharedActions } from 'app/store/slices/sharedLinks';
import { t } from 'i18next';
import { errorService, localStorageService } from 'services';

export const useAccessRequests = () => {
  const dispatch = useAppDispatch();
  const removeAccessRequestFromList = (invitationId: string) => {
    dispatch(sharedActions.popAccessRequest(invitationId));
  };

  const onAcceptAccessRequest = async (
    invitationId: string,
    payload: Pick<AcceptInvitationToSharedFolderPayload, 'roleId'>,
  ) => {
    try {
      const user = localStorageService.getUser() as UserSettings;
      const { mnemonic } = user;
      const code = stringUtils.generateRandomStringUrlSafe(8);
      const encryptedMnemonic = aes.encrypt(mnemonic, code);

      await shareService.acceptSharedFolderInvite({
        invitationId: invitationId,
        acceptInvite: {
          encryptionKey: encryptedMnemonic,
          encryptionAlgorithm: 'inxt-v2',
          roleId: payload.roleId,
        },
      });

      removeAccessRequestFromList(invitationId);
    } catch (error) {
      const castedError = errorService.castError(error);
      console.error('[ACCESS REQUEST] Error while accepting an access request: ', castedError);
      notificationsService.show({
        text: t('notificationMessages.errorAcceptingAccessRequest'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
    }
  };

  const onDeclineAccessRequest = async (invitationId: string): Promise<void> => {
    try {
      await shareService.declineSharedFolderInvite({
        invitationId,
      });
      removeAccessRequestFromList(invitationId);
    } catch (error) {
      const castedError = errorService.castError(error);
      console.error('[ACCESS REQUEST] Error while declining an access request: ', castedError);
      notificationsService.show({
        text: t('notificationMessages.errorDecliningAccessRequest'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
    }
  };

  return {
    onAcceptAccessRequest,
    onDeclineAccessRequest,
  };
};
