import { Dropdown } from 'react-bootstrap';

import UilEllipsisH from '@iconscout/react-unicons/icons/uil-ellipsis-h';
import dateService from '../../../core/services/date.service';
import BackupDropdownActions from '../BackupDropdownActions/BackupDropdownActions';
import { DriveItemData } from '../../../drive/types';
import { DriveItemAction } from '../../../drive/components/DriveExplorer/DriveExplorerItem';
import iconService from '../../../drive/services/icon.service';
import sizeService from '../../../drive/services/size.service';

export default function BackupsAsFoldersListItem({
  item,
  onDownloadClicked,
  onDeleteClicked,
  onDoubleClick,
  dataTest,
}: {
  item: DriveItemData;
  onDownloadClicked: (target: typeof item) => void;
  onDeleteClicked: (target: typeof item) => void;
  onDoubleClick: (target: typeof item) => void;
  dataTest: string;
}): JSX.Element {
  const Icon = iconService.getItemIcon(item.isFolder, item.type);
  const size = 'size' in item ? sizeService.bytesToString(item.size) : '';
  const displayName = item.type ? `${item.name}.${item.type}` : item.name;

  return (
    <div
      className={'flex items-center border-b border-neutral-30 py-3.5 hover:bg-blue-20'}
      onDoubleClick={() => onDoubleClick(item)}
      data-test={dataTest}
    >
      <div className="box-content flex w-0.5/12 items-center justify-center px-3">
        <Icon className={'h-8 w-8'} />
      </div>
      <p className="flex-1 truncate pr-3">{displayName}</p>
      <div className="hidden w-3/12 items-center lg:flex">
        {dateService.format(item.createdAt, 'DD MMMM YYYY. HH:mm')}
      </div>
      <div className="flex w-2/12 items-center">{size}</div>
      <div className="flex w-1/12 items-center rounded-tr-4px">
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-list-item-actions-button">
            <UilEllipsisH className="h-full w-full" />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <BackupDropdownActions
              hiddenActions={[DriveItemAction.Info]}
              onDownloadButtonClicked={() => onDownloadClicked(item)}
              onDeleteButtonClicked={() => onDeleteClicked(item)}
              onInfoButtonClicked={() => undefined}
            />
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </div>
  );
}
