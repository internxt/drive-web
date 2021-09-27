import { Backup } from '../../models/interfaces';
import * as Unicons from '@iconscout/react-unicons';
import dateService from '../../services/date.service';
import { ReactComponent as BackupIcon } from '../../assets/icons/light/folder-backup.svg';
import sizeService from '../../services/size.service';

export default function BackupsListItem({ backup }: { backup: Backup }): JSX.Element {
  const basename = backup.path.split(/[/\\]/).pop();

  return (
    <div className="py-3.5 border-b border-l-neutral-30 flex items-center hover:bg-blue-20">
      <div className="w-0.5/12 px-3 flex items-center justify-center box-content">
        <BackupIcon className="w-6 h-6" />
      </div>
      <p className="flex-grow pr-3">{basename}</p>
      <div className="w-2/12 hidden items-center xl:flex"></div>
      <div className="w-3/12 hidden items-center lg:flex">
        {dateService.format(backup.lastBackupAt, 'DD MMMM YYYY. HH:mm')}
      </div>
      <div className="w-2/12 flex items-center">{sizeService.bytesToString(backup.size, false)}</div>
      <div className="w-1/12 flex items-center rounded-tr-4px">
        <Unicons.UilCloudDownload className="w-5 h-5 cursor-pointer text-blue-50" />
      </div>
    </div>
  );
}
