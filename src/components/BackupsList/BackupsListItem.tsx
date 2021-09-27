import { Backup } from '../../models/interfaces';
import * as Unicons from '@iconscout/react-unicons';
import dateService from '../../services/date.service';
import { ReactComponent as BackupIcon } from '../../assets/icons/light/folder-backup.svg';
import sizeService from '../../services/size.service';

export default function BackupsListItem({
  backup,
  onDownload,
}: {
  backup: Backup;
  onDownload: (backup: Backup) => void;
}): JSX.Element {
  const isUploaded = !!backup.fileId;

  return (
    <div
      className={`py-3.5 border-b border-l-neutral-30 flex items-center hover:bg-blue-20 ${
        isUploaded ? '' : 'text-gray-40'
      }`}
    >
      <div className="w-0.5/12 px-3 flex items-center justify-center box-content">
        <BackupIcon className={`w-8 h-8 ${isUploaded ? '' : 'filter grayscale opacity-40'}`} />
      </div>
      <p className="flex-grow pr-3">{backup.name}</p>
      <div className="w-2/12 hidden items-center xl:flex"></div>
      <div className="w-3/12 hidden items-center lg:flex">
        {backup.lastBackupAt ? dateService.format(backup.lastBackupAt, 'DD MMMM YYYY. HH:mm') : 'Not uploaded yet'}
      </div>
      <div className="w-2/12 flex items-center">{backup.size ? sizeService.bytesToString(backup.size, false) : ''}</div>
      <div className="w-1/12 flex items-center rounded-tr-4px" onClick={() => isUploaded && onDownload(backup)}>
        <Unicons.UilCloudDownload className={`w-5 h-5 ${isUploaded ? 'cursor-pointer text-blue-50' : ''}`} />
      </div>
    </div>
  );
}
