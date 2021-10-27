import { useEffect, useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import UilEnvelope from '@iconscout/react-unicons/icons/uil-envelope';
import UilPaperclip from '@iconscout/react-unicons/icons/uil-paperclip';
import { emailRegexPattern } from '@internxt/lib/dist/src/auth/isValidEmail';

import localStorageService from '../../../../services/local-storage.service';
import BaseButton from 'app/shared/components/forms/BaseButton';
import { IFormValues } from '../../../../types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import errorService from '../../../../services/error.service';
import { getCredit, sendClaimEmail, sendInvitationEmail } from 'app/referrals/services/referral.service';
import i18n from 'app/i18n/services/i18n.service';
import AuthButton from 'app/shared/components/AuthButton';
import BaseInput from 'app/shared/components/forms/inputs/BaseInput';

const AccountReferralsTab = (): JSX.Element => {
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
    reset,
  } = useForm<IFormValues>({ mode: 'onChange' });

  const email = useWatch({ control, name: 'email', defaultValue: '' });
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const [isLoadingClaim, setIsLoadingClaim] = useState(false);
  const [credit, setCredit] = useState(0);
  const user = localStorageService.getUser();
  const [linkToCopy, setLinkToCopy] = useState('');

  const onSubmit: SubmitHandler<IFormValues> = async (formData) => {
    try {
      if (!formData.email) {
        throw new Error('Email can not be empty');
      }
      setIsLoadingInvite(true);
      await sendInvitationEmail(formData.email);
      notificationsService.show(i18n.get('success.referralInvitationSent'), ToastType.Success);
      reset();
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      notificationsService.show(castedError.message || i18n.get('error.sendReferralInvitation'), ToastType.Error);
    } finally {
      setIsLoadingInvite(false);
    }
  };

  const onClaim = async () => {
    if (credit <= 0) {
      notificationsService.show(i18n.get('error.anyReferralCredit'), ToastType.Info);
      return;
    }
    try {
      setIsLoadingClaim(true);
      await sendClaimEmail(email);
      notificationsService.show(i18n.get('success.claimEmailSent'), ToastType.Success);
    } catch (err: unknown) {
      notificationsService.show(i18n.get('error.sendClaimEmail'), ToastType.Error);
    } finally {
      setIsLoadingClaim(false);
    }
  };

  useEffect(() => {
    const loadCredit = async () => {
      try {
        const credit = await getCredit();

        if (credit) {
          setCredit(credit);
        }
      } catch (err: unknown) {
        const castedError = errorService.castError(err);

        console.error(castedError.message);
      }
    };

    loadCredit();
  }, []);

  useEffect(() => {
    if (user) {
      setLinkToCopy(`https://internxt.com/?ref=${user.uuid}`);
    }
  }, [user]);

  return (
    <div className="flex w-full justify-center">
      <div className="flex w-96 mt-16 flex-col items-center justify-center text-center">
        <span className="account_config_title">Earn money by referring friends</span>

        <span className="text-center font-normal text-base text-neutral-700 mt-2">
          Invite friends who aren't on Internxt yet. You'll both get €5 of Internxt credit as soon as they activate
          their account. You can redeem that credit for a premium Internxt membership, or exclusive Internxt merch.
          Start earning money today!
        </span>

        <form className="w-full mt-4 flex justify-between" onSubmit={handleSubmit(onSubmit)}>
          <BaseInput
            placeholder="example@example.com"
            label="email"
            type="email"
            icon={<UilEnvelope className="w-4" />}
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Email must not be empty' }}
            pattern={{ value: emailRegexPattern, message: 'Email not valid' }}
            error={errors.email}
          />

          <div className="w-28 ml-2.5">
            <AuthButton
              text="Invite"
              textWhenDisabled={isValid ? 'Inviting...' : 'Invite'}
              isDisabled={isLoadingInvite || !isValid}
            />
          </div>
        </form>

        <div
          className="w-full bg-l-neutral-20 flex items-center p-3 justify-between rounded-md cursor-pointer"
          onClick={() => {
            navigator.clipboard.writeText(linkToCopy);
            notificationsService.show(i18n.get('success.linkCopied'), ToastType.Info);
          }}
        >
          <span className="text-neutral-700 text-sm truncate mr-3">{linkToCopy}</span>
          <UilPaperclip className="text-blue-60 w-4" />
        </div>

        <span className="my-5 text-neutral-900 font-semibold">You have accumulated {credit}€</span>

        <BaseButton disabled={isLoadingClaim} onClick={onClaim} className="primary w-1/2">
          {isLoadingClaim ? 'Claiming bonus...' : 'Claim'}
        </BaseButton>
      </div>
    </div>
  );
};

export default AccountReferralsTab;
