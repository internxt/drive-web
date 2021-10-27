import { Device } from '../../types';
import UilApple from '@iconscout/react-unicons/icons/uil-apple';
import UilLinux from '@iconscout/react-unicons/icons/uil-linux';
import UilWindows from '@iconscout/react-unicons/icons/uil-windows';
import UilDesktop from '@iconscout/react-unicons/icons/uil-desktop';
import dateService from '../../../core/services/date.service';
import sizeService from '../../../drive/services/size.service';

export default function DeviceListItem({
  device,
  onClick,
}: {
  device: Device;
  onClick: (clickedDevice: Device) => void;
}): JSX.Element {
  let Icon;

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

  return (
    <div
      className="py-3.5 border-b border-l-neutral-30 flex items-center hover:bg-blue-20"
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
      <div className="w-2/12 flex items-center">{sizeService.bytesToString(device.size)}</div>
    </div>
  );
}
