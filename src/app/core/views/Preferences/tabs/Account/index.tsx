import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { RootState } from 'app/store';
import { useSelector } from 'react-redux';
import AccountDetails from './AccountDetails';
import DeleteAccount from './DeleteAccount';
import InviteAFriend from './InviteAFriend';
import Language from './Language';
import Usage from './Usage';
import UserHeader from './UserHeader';
import Appearance from './Appearance';

export default function AccountTab({ className = '' }: { className?: string }): JSX.Element {
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const isFreeAccount = user?.hasReferralsProgram;

  return (
    <>
      {isFreeAccount ? (
        <div className={className}>
          <UserHeader />
          <div className="mt-8 flex flex-col flex-wrap gap-x-10 gap-y-8 xl:flex-row">
            <div className="flex flex-1 flex-col space-y-8">
              <Usage />
              <InviteAFriend />
            </div>
            <div className="flex flex-1 flex-col space-y-8">
              <AccountDetails />
              <Language />
              <Appearance />
              <DeleteAccount />
            </div>
          </div>
        </div>
      ) : (
        <div className={className}>
          <UserHeader />
          <div className="mt-8 flex flex-row flex-wrap gap-x-10 gap-y-8">
            <div className="flex flex-1 flex-col space-y-8">
              <Usage />
              <Language />
              <Appearance />
            </div>
            <div className="flex flex-1 flex-col space-y-8">
              <AccountDetails />
              <DeleteAccount />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
