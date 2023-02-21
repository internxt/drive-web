import { Device } from '../../types';
import UilApple from '@iconscout/react-unicons/icons/uil-apple';
import UilLinux from '@iconscout/react-unicons/icons/uil-linux';
import UilWindows from '@iconscout/react-unicons/icons/uil-windows';
import UilDesktop from '@iconscout/react-unicons/icons/uil-desktop';
import dateService from '../../../core/services/date.service';
import sizeService from '../../../drive/services/size.service';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

export default function DeviceListItem({
  device,
  onClick,
  onDoubleClick,
}: {
  device: Device | (DriveFolderData & { size: number });
  onClick: (clickedDevice: typeof device) => void;
  onDoubleClick: (clickedDevice: typeof device) => void;
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
      className="flex flex-grow items-center py-3.5"
      onClick={() => onClick(device)}
      onDoubleClick={() => onDoubleClick(device)}
    >
      <div className="box-content flex w-0.5/12 items-center justify-center px-3">
        <Icon className="h-8 w-8" />
      </div>
      <p className="flex-grow pr-3">{device.name}</p>
      <div className="hidden w-2/12 items-center xl:flex"></div>
      <div className="hidden w-3/12 items-center lg:flex">
        {dateService.format(device.updatedAt, 'DD MMMM YYYY. HH:mm')}
      </div>
      <div className="flex w-2/12 items-center">{size}</div>
    </div>
  );
}
