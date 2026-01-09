import { Avatar } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { formatVersionDate } from '../utils';

interface CurrentVersionItemProps {
  createdAt: string;
  userName: string;
  userAvatar: string | null;
}

export const CurrentVersionItem = ({ createdAt, userName, userAvatar }: CurrentVersionItemProps) => {
  const { translate } = useTranslationContext();

  return (
    <div className="group flex items-start justify-between border-b-[1px] border-[#ECECEC] dark:border-[#474747] px-5 py-3 hover:bg-gray-1 dark:hover:bg-gray-5">
      <div className="flex min-w-0 flex-1 flex-col space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-gray-100">{formatVersionDate(createdAt)}</span>
          <span className="rounded bg-primary/10 px-[4px] py-[2px] text-xs font-semibold text-primary dark:bg-[#082D66] dark:text-[#72AAFF]">
            {translate('modals.versionHistory.current')}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Avatar src={userAvatar} fullName={userName} diameter={24} />
          <span className="text-base text-gray-60 dark:text-gray-80">{userName}</span>
        </div>
      </div>
    </div>
  );
};
