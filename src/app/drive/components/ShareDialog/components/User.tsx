import { CaretDown } from '@phosphor-icons/react';
import { Avatar } from '@internxt/ui';
import { MouseEvent } from 'react';
import { UserOptions } from './UserOptions';
import { InvitedUserProps } from '../types';

interface UserProps {
  user: InvitedUserProps;
  listPosition: number | null;
  translate: (key: string, props?: Record<string, unknown>) => string;
  openUserOptions: (
    event: MouseEvent<HTMLDivElement, globalThis.MouseEvent>,
    user: InvitedUserProps,
    listPosition: number | null,
  ) => void;
  selectedUserListIndex: number | null;
  userOptionsY: number;
  onRemoveUser: (user: InvitedUserProps) => void;
  userOptionsEmail?: InvitedUserProps;
  onChangeRole: (email: string, roleName: string) => void;
  disableUserOptionsPanel: boolean;
  disableRoleChange: boolean;
}

export const User = ({
  user,
  listPosition,
  translate,
  openUserOptions,
  selectedUserListIndex,
  userOptionsY,
  onRemoveUser,
  userOptionsEmail,
  onChangeRole,
  disableUserOptionsPanel,
  disableRoleChange,
}: UserProps) => (
  <div
    className={`group flex h-14 shrink-0 items-center space-x-2.5 border-t ${
      user.roleName === 'owner' ? 'border-transparent' : 'border-gray-5'
    }`}
  >
    <Avatar src={user.avatar} fullName={`${user.name} ${user.lastname}`} diameter={40} />

    <div className="flex flex-1 flex-col overflow-hidden">
      <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap font-medium leading-tight">
        {user.name}&nbsp;{user.lastname}
      </p>
      <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-none text-gray-50">
        {user.email}
      </p>
    </div>

    {user.roleName === 'owner' || disableUserOptionsPanel ? (
      <div className="px-3 text-gray-50">{translate(`modals.shareModal.list.userItem.roles.${user.roleName}`)}</div>
    ) : (
      <>
        <div
          className="relative flex h-9 cursor-pointer select-none flex-row items-center justify-center space-x-2 whitespace-nowrap rounded-lg border border-gray-10 bg-surface px-3 text-base font-medium text-gray-80 outline-none ring-2 ring-primary/0 ring-offset-2 ring-offset-transparent transition-all duration-100 ease-in-out hover:border-gray-20 focus-visible:shadow-sm focus-visible:ring-primary/50 active:bg-gray-1 group-hover:border-gray-20 group-hover:shadow-sm dark:bg-gray-5 dark:active:bg-gray-10"
          onMouseUpCapture={(event) => openUserOptions(event, user, listPosition)}
          tabIndex={-1}
        >
          <span className="pointer-events-none">
            {translate(`modals.shareModal.list.userItem.roles.${user.roleName}`)}
          </span>
          <CaretDown size={16} weight="bold" className="pointer-events-none" />
        </div>
        <UserOptions
          listPosition={listPosition}
          selectedUserListIndex={selectedUserListIndex}
          userOptionsY={userOptionsY}
          translate={translate}
          onRemoveUser={onRemoveUser}
          userOptionsEmail={userOptionsEmail}
          selectedRole={user.roleName}
          onChangeRole={(roleName) => onChangeRole(user.email, roleName)}
          disableRoleChange={disableRoleChange}
        />
      </>
    )}
  </div>
);
