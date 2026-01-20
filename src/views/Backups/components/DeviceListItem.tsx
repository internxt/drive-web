import UilApple from '@iconscout/react-unicons/icons/uil-apple';
import UilLinux from '@iconscout/react-unicons/icons/uil-linux';
import UilWindows from '@iconscout/react-unicons/icons/uil-windows';
import UilDesktop from '@iconscout/react-unicons/icons/uil-desktop';
import dateService from 'services/date.service';
import sizeService from '../../../app/drive/services/size.service';
import { Device } from '@internxt/sdk/dist/drive/backups/types';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

type Item = (Device & { name: string; size: number }) | (DriveFolderData & { size: number });

interface DeviceNameCellProps {
  device: Item;
  onDeviceClicked: (device: Device | DriveFolderData) => void;
}

export function DeviceNameCell({ device, onDeviceClicked }: Readonly<DeviceNameCellProps>): JSX.Element {
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

  return (
    <div className="flex min-w-activity cursor-default flex-row items-center justify-center">
      <div className="mr-3 h-8 w-8">
        <Icon className="h-8 w-8" />
      </div>
      <div className="grow cursor-default truncate pr-3">
        <button className="z-10 shrink cursor-pointer truncate" onClick={() => onDeviceClicked(device)}>
          {device.name}
        </button>
      </div>
    </div>
  );
}

interface DeviceDateCellProps {
  device: Item;
  translate: (key: string) => string;
}

export function DeviceDateCell({ device, translate }: Readonly<DeviceDateCellProps>): JSX.Element {
  return <div>{dateService.formatDefaultDate(device.updatedAt, translate)}</div>;
}

interface DeviceSizeCellProps {
  device: Item;
}

export function DeviceSizeCell({ device }: Readonly<DeviceSizeCellProps>): JSX.Element {
  const size = 'size' in device && device.size > 0 ? sizeService.bytesToString(device.size) : '-';
  return <div>{size}</div>;
}
