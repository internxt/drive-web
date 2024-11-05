import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { t } from 'i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import ChangePassword from './components/ChangePassword';
import ExportBackupKey from './components/ExportBackupKey';
import FrecuentlyAskedQuestions from './components/FrecuentlyAskedQuestions';
import TwoFactorAuthentication from './components/TwoFactorAuthentication';
import Section from 'app/newSettings/components/Section';

const SecuritySection = ({ onClosePreferences }: { onClosePreferences: () => void }) => {
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);

  return (
    <Section title={t('preferences.account.security.title')} onClosePreferences={onClosePreferences}>
      <>
        {user && (
          <div className="flex justify-between">
            <ChangePassword user={user} />
            <TwoFactorAuthentication />
          </div>
        )}
        <div className="flex justify-between">
          <ExportBackupKey />
        </div>
        <hr className="h-px border-gray-10" />
        <FrecuentlyAskedQuestions />
      </>
    </Section>
  );
};

export default SecuritySection;
