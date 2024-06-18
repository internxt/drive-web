import { useState } from 'react';
import { useAppDispatch } from '../../../../../store/hooks';
import { refreshUserThunk } from '../../../../../store/slices/user';
import BackupKey from './BackupKey';
import ChangePassword from './ChangePassword';
import Faq from './Faq';
import Lock from './Lock';
import TwoFA from './TwoFA';

export default function SecurityTab({ className = '' }: { className?: string }): JSX.Element {
  const dispatch = useAppDispatch();
  const [state, setState] = useState<{ tag: 'locked' } | { tag: 'unlocked'; password: string }>({ tag: 'locked' });

  return (
    <div className={className}>
      <div className="flex flex-col flex-wrap justify-center gap-x-10 gap-y-8 xl:flex-row">
        {state.tag === 'unlocked' ? (
          <>
            <div className="flex flex-1 flex-col space-y-8">
              <ChangePassword
                onPasswordChanged={(newPassword) => {
                  setState({ tag: 'unlocked', password: newPassword });
                  // timeout to prevent race condition
                  setTimeout(() => dispatch(refreshUserThunk({ forceRefresh: true })), 4000);
                }}
                currentPassword={state.password}
              />
              <TwoFA password={state.password} />
              <BackupKey />
            </div>

            <div className="flex w-full flex-col space-y-8 xl:w-96">
              <Faq />
            </div>
          </>
        ) : (
          <Lock className="w-full max-w-lg" onUnlock={(password) => setState({ tag: 'unlocked', password })} />
        )}
      </div>
    </div>
  );
}
