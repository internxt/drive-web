import { MemberRole } from '../../../../types/types';

type RoleProps = {
  role?: MemberRole;
  roleText: string;
  size: string;
};

const RoleBadge = ({ role, roleText, size }: RoleProps) => {
  if (!role) return <></>;

  const roleColorMapping = {
    owner: 'bg-indigo',
    manager: 'bg-primary/15 dark:bg-primary/50',
    member: 'bg-gray-10 dark:bg-gray-20',
    deactivated: 'bg-red/15 dark:bg-red/50',
    current: 'bg-primary/15 dark:bg-primary/50',
  };

  const roleTextColorMapping = {
    owner: 'text-white',
    manager: 'text-primary dark:text-white',
    member: 'text-gray-60 dark:text-white',
    deactivated: 'text-red dark:text-white',
    current: 'text-primary dark:text-white',
  };

  const sizeMapping = {
    small: 'text-xs h-5 px-1.5',
    medium: 'text-sm h-7 px-2',
  };

  return (
    <div className={`flex w-fit items-center justify-center rounded-md ${roleColorMapping[role]} ${sizeMapping[size]}`}>
      <span className={`${roleTextColorMapping[role]} text-center font-medium`}>{roleText}</span>
    </div>
  );
};

export default RoleBadge;
