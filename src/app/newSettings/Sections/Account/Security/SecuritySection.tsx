import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { RootState } from 'app/store';
import { useState } from 'react';
import { useSelector } from 'react-redux';

import { t } from 'i18next';

import Section from 'app/newSettings/components/Section';

import ChangePassword from './components/ChangePassword';
import EnterPassword from './components/EnterPassword';
import ExportBackupKey from './components/ExportBackupKey';
import FrecuentlyAskedQuestions from './components/FrecuentlyAskedQuestions';
import TwoFactorAuthentication from './components/TwoFactorAuthentication';

const SecuritySection = ({ onClosePreferences }: { onClosePreferences: () => void }) => {
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);

  const [state, setState] = useState<{ tag: 'locked' } | { tag: 'unlocked'; password: string }>({ tag: 'locked' });

  return (
    <Section title={t('preferences.account.security.title')} onClosePreferences={onClosePreferences}>
      {state.tag === 'unlocked' ? (
        <>
          <div className="flex justify-between">
            <ChangePassword
              onPasswordChanged={(newPassword) => setState({ tag: 'unlocked', password: newPassword })}
              currentPassword={state.password}
              user={user}
            />
            <TwoFactorAuthentication password={state.password} />
          </div>
          <div className="flex justify-between">
            <ExportBackupKey />
          </div>
          <hr className="h-px border-gray-10" />
          <FrecuentlyAskedQuestions />
        </>
      ) : (
        <EnterPassword onUnlock={(password) => setState({ tag: 'unlocked', password })} user={user} />
      )}
    </Section>
  );
};

export default SecuritySection;
