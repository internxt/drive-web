import { Device } from '../../types';
import { Dropdown } from 'react-bootstrap';
import UilApple from '@iconscout/react-unicons/icons/uil-apple';
import UilLinux from '@iconscout/react-unicons/icons/uil-linux';
import UilWindows from '@iconscout/react-unicons/icons/uil-windows';
import UilDesktop from '@iconscout/react-unicons/icons/uil-desktop';
import UilEllipsisH from '@iconscout/react-unicons/icons/uil-ellipsis-h';
import dateService from '../../../core/services/date.service';
import sizeService from '../../../drive/services/size.service';
import DeviceDropdownActions from '../DeviceDropdownActions/DeviceDropdownActions';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

export default function DeviceListItem({
  device,
  onClick,
  onDeleteClick,
}: {
  device: Device | DriveFolderData;
  onClick: (clickedDevice: typeof device) => void;
  onDeleteClick: (clickedDevice: typeof device) => void;
}): JSX.Element {
  let Icon;

  if ('platform' in device) {
    switch (device.platform) {
      case 'darwin':
        Icon = UilApple;
        break;
      case 'linux':
        Icon = UilLinux;
        break;
      case 'win32':
        Icon = UilWindows;
        break;
      default:
        Icon = UilDesktop;
    }
  } else Icon = UilDesktop;

  const size = 'size' in device ? sizeService.bytesToString(device.size) : '';

  return (
    <div
      className="py-3.5 border-b border-neutral-30 flex items-center hover:bg-blue-20"
      onDoubleClick={() => onClick(device)}
    >
      <div className="w-0.5/12 px-3 flex items-center justify-center box-content">
        <Icon className="h-8 w-8" />
      </div>
      <p className="flex-grow pr-3">{device.name}</p>
      <div className="w-2/12 hidden items-center xl:flex"></div>
      <div className="w-3/12 hidden items-center lg:flex">
        {dateService.format(device.updatedAt, 'DD MMMM YYYY. HH:mm')}
      </div>
      <div className="w-2/12 flex items-center">{size}</div>
      <div className="w-1/12 flex items-center rounded-tr-4px">
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-list-item-actions-button">
            <UilEllipsisH className="w-full h-full" />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <DeviceDropdownActions onDeleteButtonClicked={() => onDeleteClick(device)} />
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </div>
  );
}
