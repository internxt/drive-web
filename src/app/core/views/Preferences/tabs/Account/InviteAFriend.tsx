import { ReferralKey } from '@internxt/sdk/dist/drive/referrals/types';
import { FriendInvite } from '@internxt/sdk/dist/drive/users/types';
import { useAppSelector } from 'app/store/hooks';
import { CheckCircle, Info, Question } from 'phosphor-react';
import { useEffect, useState } from 'react';
import userService from '../../../../../auth/services/user.service';
import i18n from '../../../../../i18n/services/i18n.service';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Input from '../../../../../shared/components/Input';
import Modal from '../../../../../shared/components/Modal';
import Spinner from '../../../../../shared/components/Spinner/Spinner';
import errorService from '../../../../services/error.service';
import Section from '../../components/Section';

export default function InviteAFriend({ className = '' }: { className?: string }): JSX.Element {
  const [email, setEmail] = useState('');

  const referrals = useAppSelector((state) => state.referrals.list);

  const inviteFriend = referrals.map(referral => referral.key).includes(ReferralKey.InviteFriends);

  const [status, setStatus] = useState<'READY' | 'LOADING' | 'CANT_INVITE_MORE'>('READY');

  const [modalOpen, setModalOpen] = useState(false);

  async function onInvite() {
    try {
      setStatus('LOADING');
      await userService.inviteAFriend(email);
      setEmail('');
      notificationsService.show({ text: i18n.get('success.inviteAFriend', { email }), type: ToastType.Info });
      setStatus('READY');
    } catch (err) {
      const castedError = errorService.castError(err);
      if (castedError.message !== 'Mail invitation daily limit reached') {
        notificationsService.show({
          text: i18n.get('error.inviteAFriend', { message: castedError.message }),
          type: ToastType.Error,
        });
        setStatus('READY');
      } else {
        setStatus('CANT_INVITE_MORE');
      }
    }
  }

  return (
    <Section className={className} title={i18n.get('inviteAFriend.title')}>
      <Card>
        <p className="text-gray-80">
          {inviteFriend ? i18n.get('inviteAFriend.description', { N: 4 }) : i18n.get('inviteAFriend.description', { N: 2 })}
        </p>
        <div className="mt-3">
          {status !== 'CANT_INVITE_MORE' ? (
            <Input
              disabled={status === 'LOADING'}
              value={email}
              onChange={setEmail}
              label="Friend email address"
              placeholder="Enter friend email"
            />
          ) : (
            <div className="flex h-9 items-center rounded-lg bg-gray-5 px-3 py-2.5 text-gray-80">
              <Info size={18} />
              <p className="ml-1.5 text-sm">{i18n.get('inviteAFriend.errors.dailyEmailLimit')}</p>
            </div>
          )}
        </div>
        <div className="mt-5 flex">
          {status !== 'CANT_INVITE_MORE' && (
            <Button loading={status === 'LOADING'} onClick={onInvite} className="mr-4" variant="secondary">
              {i18n.get('inviteAFriend.actions.sendInvitation')}
            </Button>
          )}
          <button onClick={() => setModalOpen(true)} className="font-medium text-primary underline">
            {i18n.get('inviteAFriend.actions.seeInvitations')}
          </button>
        </div>
      </Card>
      <InviteListModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </Section>
  );
}
function InviteListModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [invites, setInvites] = useState<FriendInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      userService.getFriendInvites().then((invites) => {
        setInvites(invites);
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  const numberOfAcceptedInvites = invites.reduce((prev, current) => prev + (current.accepted ? 1 : 0), 0);
  const numberOfPendingInvites = invites.length - numberOfAcceptedInvites;

  const [resendingEmail, setResendingEmail] = useState<null | string>(null);

  async function onResend(email) {
    setResendingEmail(email);
    try {
      await userService.inviteAFriend(email);
      notificationsService.show({ text: 'Invitation resent successfully', type: ToastType.Info });
    } catch (err) {
      const castedError = errorService.castError(err);
      notificationsService.show({
        text: `Error while resending email: ${castedError.message}`,
        type: ToastType.Error,
      });
    } finally {
      setResendingEmail(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium text-gray-80">Friends invited</h1>
        <div className="flex">
          <div className="flex h-7 items-center rounded-md bg-gray-5 px-2 text-gray-80">
            <Question size={14} />
            <p className="ml-1 text-xs">Pending</p>
            <p className="ml-2 text-sm font-medium">{numberOfPendingInvites}</p>
          </div>
          <div className="ml-2 flex h-7 items-center rounded-md bg-gray-5 px-2 text-gray-80">
            <CheckCircle weight="fill" className="text-green" size={14} />
            <p className="ml-1 text-xs">Accepted</p>
            <p className="ml-2 text-sm font-medium">{numberOfAcceptedInvites}</p>
          </div>
        </div>
      </div>
      {!isLoading && invites.length !== 0 ? (
        <>
          <div className="mt-4 flex justify-between border-b border-gray-5 px-3 pb-1 font-medium text-gray-80">
            <div className="flex items-center">
              <Info size={20} />
              <p className="ml-2">Email</p>
            </div>
            <p>Total: {invites.length}</p>
          </div>
          {invites.map((invite) => (
            <div className="group flex h-9 items-center justify-between rounded-md px-3 hover:bg-gray-5">
              <div className="flex items-center">
                {invite.accepted ? (
                  <CheckCircle className="text-green" weight="fill" size={20} />
                ) : (
                  <Question className="text-gray-40" size={20} />
                )}
                <p className="ml-2 text-lg">{invite.guestEmail}</p>
              </div>
              {!invite.accepted && (
                <button
                  className="hidden font-medium text-primary disabled:text-gray-50 group-hover:block"
                  disabled={resendingEmail === invite.guestEmail}
                  onClick={() => onResend(invite.guestEmail)}
                >
                  Resend invitation
                </button>
              )}
            </div>
          ))}
        </>
      ) : (
        <div className="flex h-32 items-center justify-center">
          {isLoading ? (
            <Spinner className="h-8 w-8 text-gray-50" />
          ) : (
            <p className="font-medium text-gray-50">You have not invited anyone yet</p>
          )}
        </div>
      )}
    </Modal>
  );
}
