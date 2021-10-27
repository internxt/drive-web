import { Dropdown } from 'react-bootstrap';

import { DeviceBackup } from '../../types';
import UilEllipsisH from '@iconscout/react-unicons/icons/uil-ellipsis-h';
import dateService from '../../../core/services/date.service';
import { ReactComponent as BackupIcon } from '../../../../assets/icons/light/folder-backup.svg';
import sizeService from '../../../drive/services/size.service';
import { useAppDispatch } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import BackupDropdownActions from '../BackupDropdownActions/BackupDropdownActions';

export default function BackupsListItem({
  backup,
  onDownloadBackupClicked,
  onDeleteBackupClicked,
}: {
  backup: DeviceBackup;
  onDownloadBackupClicked: (backup: DeviceBackup) => void;
  onDeleteBackupClicked: (backup: DeviceBackup) => void;
}): JSX.Element {
  const dispatch = useAppDispatch();
  const isUploaded = !!backup.fileId;
  const onDownload = () => isUploaded && onDownloadBackupClicked(backup);
  const onDeleteButtonClicked = () => onDeleteBackupClicked(backup);
  const onInfoButtonClicked = (e: React.MouseEvent) => {
    const infoMenuFeatures = [
      {
        label: 'Device path',
        value: backup.path,
      },
      {
        label: 'Size',
        value: sizeService.bytesToString(backup.size || 0, false),
      },
      {
        label: 'Modified',
        value: dateService.format(backup.updatedAt, 'DD MMMM YYYY'),
      },
      {
        label: 'Created',
        value: dateService.format(backup.createdAt, 'DD MMMM YYYY'),
      },
    ];

    dispatch(
      uiActions.setFileInfoItem({
        id: `backup-item-${backup.id}`,
        icon: BackupIcon,
        title: backup.name,
        features: infoMenuFeatures,
      }),
    );
    dispatch(uiActions.setIsDriveItemInfoMenuOpen(true));

    e.stopPropagation();
  };

  return (
    <div
      className={`py-3.5 border-b border-l-neutral-30 flex items-center hover:bg-blue-20 ${
        isUploaded ? '' : 'text-gray-40'
      }`}
      onDoubleClick={onDownload}
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
      <div className="w-1/12 flex items-center rounded-tr-4px">
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-list-item-actions-button">
            <UilEllipsisH className="w-full h-full" />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <BackupDropdownActions
              onDownloadButtonClicked={onDownload}
              onInfoButtonClicked={onInfoButtonClicked}
              onDeleteButtonClicked={onDeleteButtonClicked}
            />
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </div>
  );
}
