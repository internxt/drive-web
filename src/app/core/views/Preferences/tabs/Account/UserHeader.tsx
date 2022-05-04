import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Camera } from 'phosphor-react';
import { useSelector } from 'react-redux';
import DefaultAvatar from '../../../../../shared/components/DefaultAvatar';
import { RootState } from '../../../../../store';

export default function UserHeader({ className = '' }: { className?: string }): JSX.Element {
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  if (!user) throw new Error('User is not defined');

  const fullName = `${user.name} ${user.lastname}`;

  return (
    <div className={`${className} flex h-44 flex-col items-center p-5`}>
      <div className="relative">
        <DefaultAvatar diameter={80} fullName={fullName} />
        <div className="absolute right-0 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-3 border-white bg-gray-5 text-gray-60">
          <Camera size={16} />
        </div>
      </div>

      <h1 className="mt-3 text-xl font-medium text-gray-80">{fullName}</h1>
      <h2 className="leading-tight text-gray-50">{user.email}</h2>
    </div>
  );
}
