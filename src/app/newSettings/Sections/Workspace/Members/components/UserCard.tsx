import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import Avatar from '../../../../../shared/components/Avatar';
import { MemberRole } from '../../../../types';
import RoleBadge from './RoleBadge';

interface UserProps {
  name: string;
  lastname: string;
  role?: MemberRole;
  email: string;
  avatarsrc: string | null;
  styleOptions?: {
    avatarDiameter?: number;
    nameStyle: string;
    emailStyle: string;
    rolePosition: 'row' | 'column';
  };
}

const UserCard = ({ name, lastname, role, email, avatarsrc, styleOptions }: UserProps) => {
  const { translate } = useTranslationContext();
  const rolePosition = styleOptions?.rolePosition ?? 'row';
  return (
    <div className="flex flex-row space-x-2">
      <Avatar src={avatarsrc} fullName={`${name} ${lastname}`} diameter={styleOptions?.avatarDiameter ?? 36} />
      <div className="flex flex-col">
        {rolePosition === 'column' && (
          <RoleBadge role={role} roleText={translate(`preferences.workspace.members.role.${role}`)} />
        )}
        <div className="flex flex-row justify-between space-x-2">
          <span className={styleOptions?.nameStyle ?? 'text-base font-medium leading-5 text-gray-100'}>
            {name} {lastname}
          </span>
          {rolePosition === 'row' && (
            <RoleBadge role={role} roleText={translate(`preferences.workspace.members.role.${role}`)} />
          )}
        </div>
        <span className={styleOptions?.emailStyle ?? 'text-left text-sm font-normal leading-4 text-gray-50'}>
          {email}
        </span>
      </div>
    </div>
  );
};

export default UserCard;
