import AccountDetails from './AccountDetails';
import DeleteAccount from './DeleteAccount';
import InviteAFriend from './InviteAFriend';
import Usage from './Usage';
import UserHeader from './UserHeader';

export default function AccountTab({ className = '' }: { className?: string }): JSX.Element {
  return (
    <div className={className}>
      <UserHeader />
      <div className="mt-8 flex flex-wrap gap-y-8 gap-x-10">
        <div className="flex w-96 flex-col space-y-8">
          <Usage />
          <InviteAFriend />
        </div>
        <div className="flex w-96 flex-col space-y-8">
          <AccountDetails />
          <DeleteAccount />
        </div>
      </div>
    </div>
  );
}
