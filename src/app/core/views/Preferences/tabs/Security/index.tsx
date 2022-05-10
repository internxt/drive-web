import { useReducer } from 'react';
import BackupKey from './BackupKey';
import ChangePassword from './ChangePassword';
import Faq from './Faq';
import Lock from './Lock';
import TwoFA from './TwoFA';

export default function SecurityTab({ className = '' }: { className?: string }): JSX.Element {
  const [unlocked, unlock] = useReducer(() => true, false);

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-y-8 gap-x-10">
        <div className="flex w-96 flex-col space-y-8">
          {unlocked ? (
            <>
              <ChangePassword />
              <TwoFA />
              <BackupKey />
            </>
          ) : (
            <Lock onUnlock={unlock} />
          )}
        </div>
        <div className="flex w-96 flex-col space-y-8">{unlocked && <Faq />}</div>
      </div>
    </div>
  );
}
