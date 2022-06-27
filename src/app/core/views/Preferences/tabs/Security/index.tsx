import { useState } from 'react';
import BackupKey from './BackupKey';
import ChangePassword from './ChangePassword';
import Faq from './Faq';
import Lock from './Lock';
import TwoFA from './TwoFA';

export default function SecurityTab({ className = '' }: { className?: string }): JSX.Element {
  const [state, setState] = useState<{ tag: 'locked' } | { tag: 'unlocked'; password: string }>({ tag: 'locked' });

  return (
    <div className={className}>
      <div className="flex flex-row justify-center flex-wrap gap-y-8 gap-x-10">
        
          {state.tag === 'unlocked' ? (
            <>
              <div className="flex flex-1 flex-col space-y-8">
                <ChangePassword
                  onPasswordChanged={(newPassword) => setState({ tag: 'unlocked', password: newPassword })}
                  currentPassword={state.password}
                />
                <TwoFA password={state.password} />
                <BackupKey />
              </div>

              <div className="flex w-96 flex-col space-y-8">
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
