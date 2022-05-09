import { useReducer } from 'react';
import Lock from './Lock';

export default function SecurityTab({ className = '' }: { className?: string }): JSX.Element {
  const [unlocked, unlock] = useReducer(() => true, false);

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-y-8 gap-x-10">
        <div className="flex w-96 flex-col space-y-8">{!unlocked && <Lock onUnlock={unlock} />}</div>
        <div className="flex w-96 flex-col space-y-8"></div>
      </div>
    </div>
  );
}
