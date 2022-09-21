import { useState } from 'react';

import userService from 'app/auth/services/user.service';
import i18n from 'app/i18n/services/i18n.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import BaseButton from 'app/shared/components/forms/BaseButton';
import errorService from 'app/core/services/error.service';
import isValidEmail from '@internxt/lib/dist/src/auth/isValidEmail';
import { useAppSelector } from 'app/store/hooks';
import { ReferralKey } from '@internxt/sdk/dist/drive/referrals/types';

const InviteAFriendWidget = (props: { className?: string }): JSX.Element => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const referrals = useAppSelector((state) => state.referrals.list);
  const inviteFriend = referrals.map(referral => referral.key).includes(ReferralKey.InviteFriends);
  const onSendButtonClicked = async () => {
    try {
      setIsLoading(true);
      await userService.inviteAFriend(email);
      setEmail('');
      notificationsService.show({ text: i18n.get('success.inviteAFriend', { email }), type: ToastType.Info });
    } catch (err) {
      const castedError = errorService.castError(err);
      notificationsService.show({
        text: i18n.get('error.inviteAFriend', { message: castedError.message }),
        type: ToastType.Error,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`${props.className || ''} w-full max-w-lg rounded-lg border border-neutral-30 bg-neutral-10 p-6`}>
      <span className="mb-1 block w-full text-center font-semibold">{i18n.get('inviteAFriend.title')}</span>
      <span className="m-auto block max-w-xs text-center text-sm text-neutral-100">
        {inviteFriend ? i18n.get('inviteAFriend.descriptionWidget', { N: 4 }) : i18n.get('inviteAFriend.descriptionWidget', { N: 2 })}
      </span>
      <div className="mt-6 flex">
        <input
          className="no-ring semi-dense mr-2 flex-grow border border-neutral-30"
          placeholder={i18n.get('form.fields.email.placeholder')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <BaseButton
          //! TODO: isValidEmail should allow user to enter an email with lowercase and uppercase letters
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
