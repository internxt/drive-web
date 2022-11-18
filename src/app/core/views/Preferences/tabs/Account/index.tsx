import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { RootState } from 'app/store';
import { useSelector } from 'react-redux';
import AccountDetails from './AccountDetails';
import DeleteAccount from './DeleteAccount';
import InviteAFriend from './InviteAFriend';
import Usage from './Usage';
import UserHeader from './UserHeader';

export default function AccountTab({ className = '' }: { className?: string }): JSX.Element {
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const isFreeAccount = user?.hasReferralsProgram;

  return (
    <>
      {isFreeAccount ? (
        <div className={className}>
          <UserHeader />
          <div className="mt-8 flex flex-col flex-wrap gap-y-8 gap-x-10 xl:flex-row">
            <div className="flex flex-1 flex-col space-y-8">
              <Usage />
              <InviteAFriend />
            </div>
            <div className="flex flex-1 flex-col space-y-8">
              <AccountDetails />
              <DeleteAccount />
            </div>
          </div>
        </div>
      ) : (
        <div className={className}>
          <UserHeader />
          <div className="mt-8 flex flex-col flex-wrap gap-y-8 gap-x-10">
            <div className="flex flex-1 flex-row justify-center space-x-8">
              <div className="flex flex-1 flex-col space-y-8">
                <Usage />
              </div>
              <div className="flex flex-1 flex-col space-y-8">
                <AccountDetails />
              </div>
            </div>
            <div className="flex flex-1 flex-col space-y-8">
              <DeleteAccount />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
