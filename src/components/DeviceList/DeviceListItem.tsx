import { Device } from '../../models/interfaces';
import * as Unicons from '@iconscout/react-unicons';
import dateService from '../../services/date.service';
import sizeService from '../../services/size.service';

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
      Icon = Unicons.UilApple;
      break;
    case 'linux':
      Icon = Unicons.UilLinux;
      break;
    case 'win32':
      Icon = Unicons.UilWindows;
      break;
    default:
      Icon = Unicons.UilDesktop;
  }

  return (
    <div
      className="py-3.5 border-b border-l-neutral-30 flex items-center hover:bg-blue-20"
      onDoubleClick={() => onClick(device)}
    >
      <div className="w-0.5/12 px-3 flex items-center justify-center box-content">
        <Icon class="h-8 w-8" />
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
