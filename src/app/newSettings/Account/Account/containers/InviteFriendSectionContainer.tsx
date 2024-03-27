import { ReferralKey } from '@internxt/sdk/dist/drive/referrals/types';
import { Info } from '@phosphor-icons/react';
import { useState } from 'react';
import Section from '../../../../core/views/Preferences/components/Section';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import Button from '../../../../shared/components/Button/Button';
import Card from '../../../../shared/components/Card';
import Input from '../../../../shared/components/Input';
import { useAppSelector } from '../../../../store/hooks';
import VerticalDivider from '../../../components/VerticalDivider';
import useFriendInvites from '../../../hooks/useInviteFriends';

const DEFAULT_MAX_INVITATIONS = 5;

export const ExtraStorageDiv = ({ totalGB, numberOfGBObtained }) => {
  const { translate } = useTranslationContext();
  return (
    <div>
      <div>
        <span className="text-3xl font-medium text-gray-100">{numberOfGBObtained}</span>
        <span className="text-xl font-medium text-gray-100">/{totalGB} GB</span>
      </div>
      <span className="truncate text-base font-normal text-gray-60">
        {translate('preferences.account.extraStorage')}
      </span>
    </div>
  );
};

const InviteFriendSectionContainer = ({ onSeeInvitationsButtonClicked }) => {
  const { translate } = useTranslationContext();
  const { invites, isLoading, inviteFriend } = useFriendInvites();
  const [email, setEmail] = useState<string>('');
  const [invitationStatus, setInvitationStatus] = useState<'READY' | 'LOADING' | 'CANT_INVITE_MORE'>('READY');

  const referrals = useAppSelector((state) => state.referrals.list);
  const inviteAFriendReferral = referrals.find((referral) => referral.key === ReferralKey.InviteFriends);
  const numberOfAcceptedInvites = invites.reduce((prev, current) => prev + (current.accepted ? 1 : 0), 0);
  const maxInvitations = inviteAFriendReferral?.steps;

  return (
    <Section title={translate('preferences.account.inviteFriend')}>
      <Card>
        <div className="flex flex-row">
          {/* SEE INVITATIONS */}
          <div className="flex w-60 flex-col justify-between space-y-4">
            <ExtraStorageDiv numberOfGBObtained={isLoading ? '-' : numberOfAcceptedInvites} totalGB={maxInvitations} />
            <div className="flex flex-row space-x-1">
              {Array.from({ length: maxInvitations ?? DEFAULT_MAX_INVITATIONS }, (_, index) => (
                <div
                  key={index}
                  className={`h-1 grow rounded-md ${index < numberOfAcceptedInvites ? 'bg-primary' : 'bg-gray-10'}`}
                />
              ))}
            </div>
            <div>
              <Button variant="secondary" onClick={onSeeInvitationsButtonClicked}>
                {translate('preferences.account.seeInvitations')}
              </Button>
            </div>
          </div>
          <VerticalDivider className="mx-2 w-36" />
          {/* SEND INVITATION */}
          <div className="flex flex-col justify-between">
            <p className="text-sm font-normal leading-4 text-gray-60">
              {translate('preferences.account.sendInvitationDescription', { N: maxInvitations })}
            </p>
            {invitationStatus !== 'CANT_INVITE_MORE' ? (
              <div className="flex grow flex-col justify-end">
                <Input
                  placeholder={translate('preferences.account.enterFriendEmail')}
                  disabled={invitationStatus === 'LOADING'}
                  className="mt-4 h-10"
                  variant="email"
                  autoComplete="off"
                  onChange={setEmail}
                  value={email}
                  name="email"
                />
                <div>
                  <Button
                    variant="primary"
                    className="mt-2"
                    onClick={() => inviteFriend(email, setInvitationStatus)}
                    loading={invitationStatus === 'LOADING'}
                  >
                    {translate('preferences.account.sendInvitation')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center ">
                <div className="flex h-auto w-full items-center rounded-lg bg-gray-5 px-3 py-2.5 text-gray-80">
                  <Info size={18} />
                  <p className="ml-1.5 text-sm">{translate('inviteAFriend.errors.dailyEmailLimit')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Section>
  );
};

export default InviteFriendSectionContainer;
