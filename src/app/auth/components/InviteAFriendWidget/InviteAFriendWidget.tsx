import { useState } from 'react';

import userService from 'app/auth/services/user.service';
import i18n from 'app/i18n/services/i18n.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import BaseButton from 'app/shared/components/forms/BaseButton';
import errorService from 'app/core/services/error.service';
import isValidEmail from '@internxt/lib/dist/src/auth/isValidEmail';

const InviteAFriendWidget = (props: { className?: string }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const onSendButtonClicked = async () => {
    try {
      setIsLoading(true);
      await userService.inviteAFriend(email);
      setEmail('');
      notificationsService.show(i18n.get('success.inviteAFriend', { email }), ToastType.Info);
    } catch (err) {
      const castedError = errorService.castError(err);
      notificationsService.show(i18n.get('error.inviteAFriend', { message: castedError.message }), ToastType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${props.className || ''} w-full max-w-lg rounded-lg border border-l-neutral-30 p-6 bg-l-neutral-10`}
    >
      <span className="mb-1 block w-full text-center font-semibold">{i18n.get('inviteAFriend.title')}</span>
      <span className="block m-auto text-center text-m-neutral-100 text-sm max-w-xs">
        {i18n.get('inviteAFriend.description')}
      </span>
      <div className="mt-6 flex">
        <input
          className="flex-grow no-ring mr-2 border border-l-neutral-30 semi-dense"
          placeholder={i18n.get('form.fields.email.placeholder')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <BaseButton
          disabled={isLoading || !email || !isValidEmail(email)}
          className="primary inverse"
          onClick={onSendButtonClicked}
        >
          {i18n.get('inviteAFriend.actions.sendInvitation')}
        </BaseButton>
      </div>
    </div>
  );
};

export default InviteAFriendWidget;
