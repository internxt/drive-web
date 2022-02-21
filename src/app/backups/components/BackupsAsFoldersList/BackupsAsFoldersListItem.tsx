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
}: {
  item: DriveItemData;
  onDownloadClicked: (target: typeof item) => void;
  onDeleteClicked: (target: typeof item) => void;
  onDoubleClick: (target: typeof item) => void;
}): JSX.Element {
  const Icon = iconService.getItemIcon(item.isFolder, item.type);
  const size = 'size' in item ? sizeService.bytesToString(item.size) : '';
  const displayName = item.type ? `${item.name}.${item.type}` : item.name;

  return (
    <div
      className={'py-3.5 border-b border-neutral-30 flex items-center hover:bg-blue-20'}
      onDoubleClick={() => onDoubleClick(item)}
    >
      <div className="w-0.5/12 px-3 flex items-center justify-center box-content">
        <Icon className={'w-8 h-8'} />
      </div>
      <p className="flex-grow pr-3">{displayName}</p>
      <div className="w-2/12 hidden items-center xl:flex"></div>
      <div className="w-3/12 hidden items-center lg:flex">
        {dateService.format(item.createdAt, 'DD MMMM YYYY. HH:mm')}
      </div>
      <div className="w-2/12 flex items-center">{size}</div>
      <div className="w-1/12 flex items-center rounded-tr-4px">
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-list-item-actions-button">
            <UilEllipsisH className="w-full h-full" />
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
