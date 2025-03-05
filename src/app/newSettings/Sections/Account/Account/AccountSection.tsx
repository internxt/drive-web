import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import Section from 'app/newSettings/components/Section';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { areCredentialsCorrect } from '../../../../auth/services/auth.service';
import userService from '../../../../auth/services/user.service';
import errorService from '../../../../core/services/error.service';
import ClearTrashDialog from '../../../../drive/components/ClearTrashDialog/ClearTrashDialog';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import { Button } from '@internxt/ui';
import { RootState } from '../../../../store';
import { useAppDispatch } from '../../../../store/hooks';
import { updateUserProfileThunk, userThunks } from '../../../../store/slices/user';
import AccountDetailsModal from './components/AccountDetailsModal';
import ChangeEmailModal from './components/ChangeEmailModal';
import EmailVerificationMessageCard from './components/EmailMessageCard';
import AccountUsageContainer from './containers/AccountUsageContainer';
import DeleteAccountContainer from './containers/DeleteAccountContainer';

import UserHeaderContainer from './containers/UserHeaderContainer';

interface AccountSectionProps {
  changeSection: ({ section, subsection }) => void;
  onClosePreferences: () => void;
}

const AccountSection = ({ changeSection, onClosePreferences }: AccountSectionProps) => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);

  if (!user) throw new Error('User is not defined');

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSendingVerificationEmail, setIsSendingVerificationEmail] = useState(false);

  useEffect(() => {
    dispatch(userThunks.refreshUserDataThunk());
  }, []);

  const onResendEmailVerification = async () => {
    setIsSendingVerificationEmail(true);
    await userService.sendVerificationEmail();
    notificationsService.show({ text: t('notificationMessages.verificationEmail'), type: ToastType.Success });
    setIsSendingVerificationEmail(false);
  };

  const changeUserEmail = async (newEmail) => {
    const emailLowerCase = newEmail.toLowerCase();
    await userService.changeEmail(emailLowerCase);
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
    <Section title={translate('preferences.account.title')} onClosePreferences={onClosePreferences}>
      <EmailVerificationMessageCard
        isVerified={user.emailVerified}
        disableButton={isSendingVerificationEmail}
        onClickResendButton={onResendEmailVerification}
      />
      <UserHeaderContainer />
      <div className="flex justify-center">
        <Button variant="secondary" className="-mt-8 w-32" onClick={() => setIsDetailsModalOpen(true)}>
          <span>{t('views.preferences.workspace.overview.edit')}</span>
        </Button>
      </div>
      <AccountUsageContainer changeSection={changeSection} />
      <div>
        <div className="h-px w-full bg-gray-10" />
      </div>
      <DeleteAccountContainer />

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
      <ClearTrashDialog />
    </Section>
  );
};

export default AccountSection;
