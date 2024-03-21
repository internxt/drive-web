import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { CheckCircle, Warning } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { areCredentialsCorrect } from '../../../../../auth/services/auth.service';
import userService from '../../../../../auth/services/user.service';
import AccountDetailsModal from '../../../../../newSettings/Account/Account/components/AccountDetailsModal';
import ChangeEmailModal from '../../../../../newSettings/Account/Account/components/ChangeEmailModal';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Tooltip from '../../../../../shared/components/Tooltip';
import { RootState } from '../../../../../store';
import { useAppDispatch } from '../../../../../store/hooks';
import { updateUserProfileThunk } from '../../../../../store/slices/user';
import errorService from '../../../../services/error.service';
import Section from '../../components/Section';

export default function AccountDetails({ className = '' }: { className?: string }): JSX.Element {
  const { translate } = useTranslationContext();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const dispatch = useAppDispatch();

  const [isSendingVerificationEmail, setIsSendingVerificationEmail] = useState(false);

  async function onResend() {
    setIsSendingVerificationEmail(true);
    await userService.sendVerificationEmail();
    notificationsService.show({ text: translate('notificationMessages.verificationEmail'), type: ToastType.Success });
    setIsSendingVerificationEmail(false);
  }

  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  if (!user) throw new Error('User is not defined');

  const isVerified = user.emailVerified;

  const changeUserEmail = async (newEmail) => {
    await userService.changeEmail(newEmail);
    notificationsService.show({
      text: translate('views.account.tabs.account.accountDetails.changeEmail.sucessSendingVerification', {
        email: newEmail,
      }),
      type: ToastType.Success,
    });
  };

  const onChangeEmailError = (error: unknown) => {
    notificationsService.show({
      text: translate('views.account.tabs.account.accountDetails.changeEmail.errorSendingVerification'),
      type: ToastType.Error,
    });
    errorService.reportError(error);
  };

  const updateUserProfile = async ({ name, lastname }: { name: string; lastname: string }) => {
    await dispatch(updateUserProfileThunk({ name, lastname })).unwrap();
    notificationsService.show({
      text: translate('views.account.tabs.account.accountDetails.editProfile.updatedProfile'),
      type: ToastType.Success,
    });
  };

  return (
    <Section className={className} title={translate('views.account.tabs.account.accountDetails.head')}>
      <Card>
        <div className="flex justify-between">
          <div className="flex min-w-0">
            <Detail label={translate('views.account.tabs.account.accountDetails.card.name')} value={user.name} />
            <Detail
              label={translate('views.account.tabs.account.accountDetails.card.lastname')}
              value={user.lastname}
              className="ml-8 pr-2"
            />
          </div>
          <Button variant="secondary" onClick={() => setIsDetailsModalOpen(true)}>
            {translate('actions.edit')}
          </Button>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div>
            <Detail label={translate('views.account.tabs.account.accountDetails.card.email')} value={user.email} />
            {!isVerified && (
              <button
                onClick={onResend}
                disabled={isSendingVerificationEmail}
                className="font-medium text-primary hover:text-primary-dark disabled:text-gray-60"
              >
                {translate('views.account.tabs.account.accountDetails.card.resendEmail')}
              </button>
            )}
          </div>
          <Tooltip
            title={
              isVerified
                ? translate('views.account.tabs.account.accountDetails.verify.verified')
                : translate('views.account.tabs.account.accountDetails.verify.verify')
            }
            popsFrom="top"
            subtitle={
              isVerified
                ? undefined
                : (translate('views.account.tabs.account.accountDetails.verify.description') as string)
            }
          >
            {isVerified ? (
              <CheckCircle weight="fill" className="text-green" size={24} />
            ) : (
              <Warning weight="fill" className="text-yellow" size={24} />
            )}
          </Tooltip>
        </div>
      </Card>

      <AccountDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        openEditEmail={() => {
          setIsDetailsModalOpen(false);
          setIsEmailModalOpen(true);
        }}
        name={user.name}
        lastname={user.lastname}
        email={user.email}
        onUpdateUserProfileData={updateUserProfile}
        onErrorUpdatingUserProfileData={() =>
          notificationsService.show({
            text: translate('views.account.tabs.account.accountDetails.editProfile.errorUpdatingProfile'),
            type: ToastType.Error,
          })
        }
      />
      <ChangeEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        email={user.email}
        checkEmailCredentials={areCredentialsCorrect}
        changeEmail={changeUserEmail}
        onChangeEmailError={onChangeEmailError}
      />
    </Section>
  );
}

function Detail({ className = '', label, value }: { className?: string; label: string; value: string }): JSX.Element {
  return (
    <div className={`${className} min-w-0 text-gray-80`}>
      <h2 className="truncate text-sm">{label}</h2>
      <h1 className="truncate text-lg font-medium">{value}</h1>
    </div>
  );
}
