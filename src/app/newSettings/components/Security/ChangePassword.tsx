import { useState } from 'react';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import ChangePasswordModal from './ChangePasswordModal';

import Section from 'app/core/views/Preferences/components/Section';
import Card from 'app/shared/components/Card';
import Button from 'app/shared/components/Button/Button';

const ChangePassword = ({
  currentPassword,
  onPasswordChanged,
  user,
}: {
  currentPassword: string;
  onPasswordChanged: (newPassword: string) => void;
  user: UserSettings | undefined;
}): JSX.Element => {
  const { translate } = useTranslationContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Section title={translate('views.account.tabs.security.changePassword.title')} className="mr-8">
      <Card>
        <p className="text-gray-60">{translate('views.account.tabs.security.changePassword.description')}</p>
        <Button
          variant="secondary"
          className="mt-3"
          onClick={() => setIsModalOpen(true)}
          dataTest="change-password-button"
        >
          {translate('views.account.tabs.security.changePassword.button')}
        </Button>
      </Card>
      <ChangePasswordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentPassword={currentPassword}
        onPasswordChanged={onPasswordChanged}
        user={user}
      />
    </Section>
  );
};

export default ChangePassword;
