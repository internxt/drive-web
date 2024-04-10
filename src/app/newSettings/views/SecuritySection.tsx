import { useState } from 'react';
import { useSelector } from 'react-redux';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { RootState } from 'app/store';

import { t } from 'i18next';

import Section from 'app/core/views/Preferences/components/Section';

import BackupKey from 'app/core/views/Preferences/tabs/Security/BackupKey';
import Faq from 'app/core/views/Preferences/tabs/Security/Faq';
import TwoFA from 'app/core/views/Preferences/tabs/Security/TwoFA';
import EnterPassword from '../components/Security/EnterPassword';
import ChangePassword from '../components/Security/ChangePassword';

const SecuritySection = () => {
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);

  const [state, setState] = useState<{ tag: 'locked' } | { tag: 'unlocked'; password: string }>({ tag: 'locked' });

  return (
    <Section
      title={t('preferences.account.security.title')}
      className="flex max-h-640 flex-1 flex-col space-y-6 overflow-y-auto p-6"
    >
      {state.tag === 'unlocked' ? (
        <>
          <div className="flex justify-between">
            <ChangePassword
              onPasswordChanged={(newPassword) => setState({ tag: 'unlocked', password: newPassword })}
              currentPassword={state.password}
              user={user}
            />
            <TwoFA password={state.password} />
          </div>
          <div className="flex justify-between">
            <BackupKey />
          </div>

          <div className="flex w-full flex-col space-y-8 xl:w-96">
            <Faq />
          </div>
        </>
      ) : (
        <EnterPassword onUnlock={(password) => setState({ tag: 'unlocked', password })} user={user} />
      )}
    </Section>
  );
};

export default SecuritySection;
