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
  dataTest,
}: {
  backup: DeviceBackup;
  onDownloadBackupClicked: (backup: DeviceBackup) => void;
  onDeleteBackupClicked: (backup: DeviceBackup) => void;
  dataTest?: string;
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
      className={`flex items-center border-b border-neutral-30 py-3.5 hover:bg-blue-20 ${
        isUploaded ? '' : 'text-gray-40'
      }`}
      onDoubleClick={onDownload}
      data-test={dataTest}
    >
      <div className="box-content flex w-0.5/12 items-center justify-center px-3">
        <BackupIcon className={`h-8 w-8 ${isUploaded ? '' : 'opacity-40 grayscale filter'}`} />
      </div>
      <p className="flex-grow pr-3">{backup.name}</p>
      <div className="hidden w-2/12 items-center xl:flex"></div>
      <div className="hidden w-3/12 items-center lg:flex">
        {backup.lastBackupAt ? dateService.format(backup.lastBackupAt, 'DD MMMM YYYY. HH:mm') : 'Not uploaded yet'}
      </div>
      <div className="flex w-2/12 items-center">{backup.size ? sizeService.bytesToString(backup.size, false) : ''}</div>
      <div className="flex w-1/12 items-center rounded-tr-4px">
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-list-item-actions-button">
            <UilEllipsisH className="h-full w-full" />
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
