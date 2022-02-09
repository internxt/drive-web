import UilHistory from '@iconscout/react-unicons/icons/uil-history';

import i18n from '../../../i18n/services/i18n.service';
import DeviceListItem from './DeviceListItem';
import desktopService from '../../../core/services/desktop.service';
import { Device } from '../../types';
import DriveListItemSkeleton from '../../../drive/components/DriveListItemSkeleton/DriveListItemSkeleton';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

interface Props {
  items: (Device | DriveFolderData)[];
  isLoading: boolean;
  onDeviceSelected: (device: Device | DriveFolderData) => void;
  onDeviceDeleted: (device: Device | DriveFolderData) => void;
}

const DeviceList = (props: Props): JSX.Element => {
  const { isLoading } = props;
  const getLoadingSkeleton = () => {
    return Array(10)
      .fill(0)
      .map((n, i) => <DriveListItemSkeleton key={i} />);
  };

  const items = props.items.map((item) => (
    <DeviceListItem
      key={item.id}
      device={item}
      onClick={props.onDeviceSelected}
      onDeleteClick={props.onDeviceDeleted}
    />
  ));

  return isLoading || items.length ? (
    <div className="flex flex-col flex-grow bg-white h-1">
      <div
        className="files-list font-semibold flex border-b\
       border-l-neutral-30 bg-white text-neutral-400 py-3 text-sm"
      >
        <div className="w-0.5/12 pl-3 flex items-center justify-start box-content"></div>
        <div className="flex-grow flex items-center px-3">{i18n.get('backups.devices-list.columns.name')}</div>
        <div className="w-2/12 hidden items-center xl:flex"></div>
        <div className="w-3/12 hidden items-center lg:flex">{i18n.get('backups.devices-list.columns.last-update')}</div>
        <div className="w-2/12 flex items-center">{i18n.get('backups.devices-list.columns.size')}</div>
        <div className="w-1/12 flex items-center">Actions</div>
      </div>
      <div className="h-full overflow-y-auto">{isLoading ? getLoadingSkeleton() : items}</div>
    </div>
  ) : (
    <div className="flex flex-col mt-24 items-center space-y-4">
      <UilHistory className="text-blue-60 h-24 w-24" />
      <h1 className="text-2xl font-bold text-gray-70">Start using backups</h1>
      <p className="text-lg text-gray-50">Save a copy of your most important files on the cloud automatically</p>
      <a
        className="pt-2 no-underline font-bold text-blue-60"
        href={desktopService.getDownloadAppUrl()}
        target="_blank"
        rel="noopener noreferrer"
      >
        Download our Desktop App to get started
      </a>
    </div>
  );
};

export default DeviceList;
