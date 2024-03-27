import { FriendInvite } from '@internxt/sdk/dist/drive/users/types';
import { useEffect, useState } from 'react';

import userService from '../../auth/services/user.service';
import errorService from '../../core/services/error.service';
import { useTranslationContext } from '../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';

export const useFriendInvites = () => {
  const { translate } = useTranslationContext();
  const [invites, setInvites] = useState<FriendInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    userService.getFriendInvites().then((invites) => {
      setInvites(invites);
      setIsLoading(false);
    });
  }, []);

  const inviteFriend = async (
    email: string,
    setInvitationStatus: (status: 'READY' | 'LOADING' | 'CANT_INVITE_MORE') => void,
  ) => {
    try {
      setInvitationStatus('LOADING');
      await userService.inviteAFriend(email);
      notificationsService.show({ text: translate('success.inviteAFriend', { email }), type: ToastType.Success });
      setInvitationStatus('READY');
    } catch (err) {
      const castedError = errorService.castError(err);
      if (castedError.message !== 'Mail invitation daily limit reached') {
        notificationsService.show({
          text: translate('error.inviteAFriendEmpty'),
          type: ToastType.Error,
        });
        setInvitationStatus('READY');
      } else {
        setInvitationStatus('CANT_INVITE_MORE');
      }
    }
  };

  return { invites, isLoading, inviteFriend };
};

export default useFriendInvites;
