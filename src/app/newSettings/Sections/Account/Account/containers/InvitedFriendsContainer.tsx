import { ReferralKey } from '@internxt/sdk/dist/drive/referrals/types';
import { ArrowCounterClockwise, Info } from '@phosphor-icons/react';
import { useState } from 'react';
import userService from '../../../../../auth/services/user.service';
import errorService from '../../../../../core/services/error.service';
import Section from '../../../../../core/views/Preferences/components/Section';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Input from '../../../../../shared/components/Input';
import Spinner from '../../../../../shared/components/Spinner/Spinner';
import { useAppSelector } from '../../../../../store/hooks';
import VerticalDivider from '../../../../components/VerticalDivider';
import useFriendInvites from '../../../../hooks/useInviteFriends';
import { ExtraStorageDiv } from './InviteFriendSectionContainer';

const InvitedFriendsContainer = () => {
  const { translate } = useTranslationContext();
  const { invites, isLoading, inviteFriend } = useFriendInvites();
  const [email, setEmail] = useState<string>('');
  const [resendingEmail, setResendingEmail] = useState<null | string>(null);
  const [invitationStatus, setInvitationStatus] = useState<'READY' | 'LOADING' | 'CANT_INVITE_MORE'>('READY');

  const referrals = useAppSelector((state) => state.referrals.list);
  const inviteAFriendReferral = referrals.find((referral) => referral.key === ReferralKey.InviteFriends);
  const numberOfAcceptedInvites = invites.reduce((prev, current) => prev + (current.accepted ? 1 : 0), 0);
  const numberOfPendingInvites = invites.length - numberOfAcceptedInvites;
  const maxInvitations = inviteAFriendReferral?.steps;

  const onResend = async (email: string) => {
    setResendingEmail(email);
    try {
      await userService.inviteAFriend(email);
      notificationsService.show({
        text: translate('success.inviteAFriend', { email }),
        type: ToastType.Success,
      });
    } catch (err) {
      const castedError = errorService.castError(err);
      notificationsService.show({
        text: translate('modals.friendsInvitedModal.resendError', {
          reason: castedError.message,
        }),
        type: ToastType.Error,
      });
    } finally {
      setResendingEmail(null);
    }
  };

  return (
    <Section title="" className="space-y-8">
      <Card>
        <div className="flex flex-col space-y-5">
          <div className="flex flex-row">
            {/* EXTRA STORAGE */}
            <div className="flex flex-1 space-y-4">
              <ExtraStorageDiv
                numberOfGBObtained={isLoading ? '-' : numberOfAcceptedInvites}
                totalGB={maxInvitations}
              />
            </div>
            <VerticalDivider className="mx-8" />
            {/* FRIENDS INVITED */}
            <div className="flex flex-1 space-y-4">
              <div>
                <div>
                  <span className="text-3xl font-medium text-gray-100">{isLoading ? '-' : numberOfPendingInvites}</span>
                </div>
                <span className=" text-base font-normal text-gray-60">
                  {translate('preferences.account.friendsInvited')}
                </span>
              </div>
            </div>
            <VerticalDivider className="mx-8" />
            {/* ACCEPTED REQUESTS */}
            <div className="flex flex-1 space-y-4">
              <div>
                <div>
                  <span className="text-3xl font-medium text-gray-100">
                    {isLoading ? '-' : numberOfAcceptedInvites}
                  </span>
                </div>
                <span className=" text-base font-normal text-gray-60">
                  {translate('preferences.account.acceptedRequests')}
                </span>
              </div>
            </div>
          </div>

          {/* SEND INVITATION*/}
          <div className="flex flex-row space-x-2">
            {invitationStatus !== 'CANT_INVITE_MORE' ? (
              <>
                <Input
                  placeholder={translate('preferences.account.enterFriendEmail')}
                  className="grow"
                  disabled={invitationStatus === 'LOADING'}
                  variant="email"
                  autoComplete="off"
                  onChange={setEmail}
                  value={email}
                  name="email"
                />
                <Button
                  variant="primary"
                  onClick={() => inviteFriend(email, setInvitationStatus)}
                  loading={invitationStatus === 'LOADING'}
                >
                  {translate('preferences.account.sendInvitation')}
                </Button>
              </>
            ) : (
              <div className="flex h-auto w-full items-center rounded-lg bg-gray-5 px-3 py-2.5 text-gray-80">
                <Info size={18} />
                <p className="ml-1.5 text-sm">{translate('inviteAFriend.errors.dailyEmailLimit')}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* INVITED USERS LIST  */}
      {!isLoading && invites.length > 0 ? (
        <div className="flex">
          <div className="flex grow flex-col rounded-l-xl border-y border-l border-gray-10">
            <h1 className={'flex flex-row justify-between rounded-tl-xl border-b border-gray-10 bg-gray-5 px-5 py-2'}>
              {translate('preferences.account.user')}
            </h1>
            {invites.map(({ guestEmail }, i) => (
              <div
                key={guestEmail}
                className={`flex flex-row justify-between border-gray-10 px-5 py-2 text-base  font-medium text-gray-100 dark:bg-gray-1 ${
                  i === invites.length - 1 ? 'rounded-bl-xl' : ' border-b'
                }`}
              >
                {guestEmail}
              </div>
            ))}
          </div>
          <div className="flex flex-col rounded-r-xl border-y border-r border-gray-10">
            <div className="rounded-tr-xl border-b border-gray-10 bg-gray-5 py-2">
              <h1 className={'flex w-56 flex-row justify-between rounded-tr-xl border-l border-gray-10 bg-gray-5 pl-5'}>
                {translate('preferences.account.sendInvitation')}
              </h1>
            </div>

            {invites.map(({ guestEmail, id, accepted }, i) => (
              <div
                key={guestEmail + id}
                className={`flex w-56 flex-row items-center justify-between border-gray-10 px-5 py-2 text-base font-normal text-gray-60 dark:bg-gray-1 ${
                  i === invites.length - 1 ? 'rounded-br-xl' : 'border-b'
                } ${accepted ? 'text-green' : ''} `}
              >
                <div className="flex w-full flex-row justify-between">
                  <text>{translate(`preferences.account.${accepted ? 'accepted' : 'pending'}`)}</text>
                  {!accepted && (
                    <button
                      className="text-gray-100"
                      disabled={resendingEmail === guestEmail}
                      onClick={() => onResend(guestEmail)}
                    >
                      {resendingEmail === guestEmail ? <Spinner size={20} /> : <ArrowCounterClockwise size={20} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <div className="flex h-40 w-full items-center justify-center">
            {isLoading ? (
              <Spinner className="h-8 w-8 text-gray-50" />
            ) : (
              <p className="text-base font-normal text-gray-50">{translate('preferences.account.noInvitations')}</p>
            )}
          </div>
        </Card>
      )}
    </Section>
  );
};

export default InvitedFriendsContainer;
