import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { User } from '../User';
import { InvitedUsersSkeletonLoader } from '../InvitedUsersSkeletonLoader';
import { InvitedUserProps } from '../../types';

interface InvitedUsersListProps {
  userList;
  invitedUsers: InvitedUserProps[];
  areInvitedUsersLoading: boolean;
  user;
  openUserOptions: (e: any, user: InvitedUserProps, selectedIndex: number | null) => void;
  userOptionsY: number;
  selectedUserListIndex: number | null;
  onRemoveUser: (user: InvitedUserProps) => void;
  currentUserFolderRole?: string;
  userOptionsEmail?: InvitedUserProps;
  handleUserRoleChange: (email: string, role: string) => Promise<void>;
}

export const InvitedUsersList = ({
  currentUserFolderRole,
  userList,
  invitedUsers,
  areInvitedUsersLoading,
  user,
  openUserOptions,
  selectedUserListIndex,
  userOptionsY,
  onRemoveUser,
  userOptionsEmail,
  handleUserRoleChange,
}: InvitedUsersListProps) => {
  const { translate } = useTranslationContext();
  const invitedUsersSorted = invitedUsers.toSorted((a, b) => {
    if (a.email === user.email && b.email !== user.email) return -1;
    return 0;
  });
  const isListLoading = invitedUsers.length === 0 && areInvitedUsersLoading;

  return (
    <div
      ref={userList}
      className="mt-1.5 flex flex-col overflow-y-auto"
      style={{ minHeight: '224px', maxHeight: '336px' }}
    >
      {isListLoading ? (
        <>
          {Array.from({ length: 4 }, (_, i) => (
            <InvitedUsersSkeletonLoader key={`loader-${i}`} />
          ))}
        </>
      ) : (
        invitedUsersSorted.map((invitedUser, index) => (
          <User
            user={invitedUser}
            key={invitedUser.email}
            listPosition={index}
            translate={translate}
            openUserOptions={openUserOptions}
            selectedUserListIndex={selectedUserListIndex}
            userOptionsY={userOptionsY}
            onRemoveUser={onRemoveUser}
            userOptionsEmail={userOptionsEmail}
            onChangeRole={handleUserRoleChange}
            disableUserOptionsPanel={currentUserFolderRole !== 'owner' && invitedUser.email !== user.email}
            disableRoleChange={currentUserFolderRole !== 'owner'}
          />
        ))
      )}
    </div>
  );
};
