import { useEffect, useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { IFormValues } from '../../../../models/interfaces';
import { getIcon } from '../../../../services/icon.service';
import localStorageService from '../../../../services/localStorage.service';
import { getCredit, sendClaimEmail, sendInvitationEmail } from '../../../../services/referral.service';
import { emailRegexPattern } from '../../../../services/validation.service';
import AuthButton from '../../../../components/Buttons/AuthButton';
import BaseButton from '../../../../components/Buttons/BaseButton';
import AuthInput from '../../../../components/Inputs/AuthInput';
import notify from '../../../../components/Notifications';
import ButtonPrimary from '../../../../components/Buttons/ButtonPrimary';

const AccountReferralsTab = (): JSX.Element => {
  const { register, formState: { errors }, handleSubmit, control, reset } = useForm<IFormValues>({ mode: 'onChange' });

  const email = useWatch({ control, name: 'email', defaultValue: '' });
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const [isLoadingClaim, setIsLoadingClaim] = useState(false);
  const [credit, setCredit] = useState(0);
  const user = localStorageService.getUser();
  const [linkToCopy, setLinkToCopy] = useState('');

  const onSubmit: SubmitHandler<IFormValues> = async formData => {
    try {
      if (!formData.email) {
        throw new Error('Email can not be empty');
      }
      setIsLoadingInvite(true);
      await sendInvitationEmail(formData.email);
      notify(`Invitation email sent to ${formData.email}`, 'success');
      reset();
    } catch (err) {
      notify(err.message || 'Could not send invitation email', 'error');

    } finally {
      setIsLoadingInvite(false);
    }
  };

  const onClaim = async () => {
    if (credit <= 0) {
      notify('You don\t have any credit on your account', 'info', 1500);
      return;
    }
    try {
      setIsLoadingClaim(true);
      await sendClaimEmail(email);
      notify('Claim email sent!', 'success');
    } catch (err) {
      notify('Could not send claim email', 'error');
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
      } catch (err) {
        console.error(err.message || err);
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
    <div className='flex w-full justify-center'>
      <div className='flex w-96 mt-16 flex-col items-center justify-center text-center'>
        <span className='text-neutral-900 font-semibold'>Earn money by referring friends</span>

        <span className='text-neutral-700 text-xs mt-3'>
          Invite friends who aren't on Internxt yet. You'll both get €5 of Internxt credit as soon as they activate their account.
          You can redeem that credit for a premium Internxt membership, or exclusive Internxt merch. Start earning money today!
        </span>

        <form className='w-full mt-4 flex justify-between' onSubmit={handleSubmit(onSubmit)}>
          <AuthInput
            placeholder='example@example.com'
            label='email'
            type='email'
            icon='mailGray'
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Email must not be empty' }}
            pattern={{ value: emailRegexPattern, message: 'Email not valid' }}
            error={errors.email}
          />

          <div className='w-28 ml-2.5'>
            <AuthButton text='Invite' textWhenDisabled='Inviting' isDisabled={isLoadingInvite} />
          </div>
        </form>

        <div className='w-full bg-l-neutral-20 flex items-center p-3 justify-between rounded-md cursor-pointer'
          onClick={() => {
            navigator.clipboard.writeText(linkToCopy);
            notify('Link copied!', 'info', 2500);
          }}>
          <span className='text-neutral-700 text-sm truncate mr-3'>{linkToCopy}</span>
          <img src={getIcon('clipboardBlue')} alt="clip" />
        </div>

        <span className='my-5 text-neutral-900 font-semibold'>
          You have accumulated {credit}€
        </span>

        <ButtonPrimary text='Claim' textWhenDisabled='Claiming bonus...' width='w-64' disabled={isLoadingClaim} onClick={onClaim} />
      </div>
    </div>
  );
};

export default AccountReferralsTab;
