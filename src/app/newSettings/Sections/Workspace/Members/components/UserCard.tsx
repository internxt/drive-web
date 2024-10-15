import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import Avatar from '../../../../../shared/components/Avatar';
import { MemberRole } from '../../../../types/types';
import RoleBadge from './RoleBadge';

interface UserProps {
  name: string;
  lastname: string;
  role?: MemberRole;
  email: string;
  avatarsrc: string | null;
  styleOptions?: {
    avatarDiameter?: number;
    containerClassName?: string;
    nameStyle: string;
    emailStyle: string;
    rolePosition: 'row' | 'column';
  };
}

const UserCard = ({ name, lastname, role, email, avatarsrc, styleOptions }: UserProps) => {
  const { translate } = useTranslationContext();
  const rolePosition = styleOptions?.rolePosition ?? 'row';
  return (
    <div className={`flex w-full flex-row items-center gap-2 ${styleOptions?.containerClassName}`}>
      <Avatar src={avatarsrc} fullName={`${name} ${lastname}`} diameter={styleOptions?.avatarDiameter ?? 36} />
      <div className="flex flex-col gap-2">
        {rolePosition === 'column' && (
          <RoleBadge role={role} roleText={translate(`preferences.workspace.members.role.${role}`)} size={'small'} />
        )}
        <div className="flex flex-col gap-0">
          <div className="flex flex-row justify-between space-x-2">
            <span
              className={
                styleOptions?.nameStyle ?? 'max-w-[120px] truncate break-all text-base font-medium text-gray-100'
              }
            >
              {name} {lastname}
            </span>
            {rolePosition === 'row' && (
              <RoleBadge
                role={role}
                roleText={translate(`preferences.workspace.members.role.${role}`)}
                size={'small'}
              />
            )}
          </div>
          <span className={styleOptions?.emailStyle ?? 'break-all text-left text-sm font-normal text-gray-50'}>
            {email}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
