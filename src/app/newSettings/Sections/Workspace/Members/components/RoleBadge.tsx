import { MemberRole } from '../../../../types/types';

type RoleProps = {
  role?: MemberRole;
  roleText: string;
};

const RoleBadge = ({ role, roleText }: RoleProps) => {
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

  return (
    <div className={`flex h-5 w-fit items-center justify-center rounded-md px-1.5 ${roleColorMapping[role]}`}>
      <span className={`${roleTextColorMapping[role]} text-center text-xs font-medium`}>{roleText}</span>
    </div>
  );
};

export default RoleBadge;
