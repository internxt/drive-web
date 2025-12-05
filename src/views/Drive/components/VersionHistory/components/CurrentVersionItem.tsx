import dateService from 'services/date.service';
import { Avatar } from '@internxt/ui';
import { FileVersion } from '../types';

interface CurrentVersionItemProps {
  version: FileVersion;
}

export const CurrentVersionItem = ({ version }: CurrentVersionItemProps) => {
  return (
    <div className="group flex items-start justify-between border-b-[2.5px] border-gray-5 px-5 py-3 hover:bg-gray-1 dark:hover:bg-gray-5">
      <div className="flex min-w-0 flex-1 flex-col space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-gray-100">
            {dateService.format(version.date, 'MMM D, h:mm A')}
          </span>
          <span className="rounded bg-primary/10 px-[4px] py-[2px] text-xs font-semibold text-primary dark:bg-[#082D66] dark:text-[#72AAFF]">
            Current
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Avatar fullName={version.userName} diameter={24} />
          <span className="text-base text-gray-60 dark:text-gray-80">{version.userName}</span>
        </div>
      </div>
    </div>
  );
};
