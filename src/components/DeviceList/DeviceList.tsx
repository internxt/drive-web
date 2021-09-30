import { Device } from '../../models/interfaces';
import i18n from '../../services/i18n.service';
import DriveListItemSkeleton from '../loaders/DriveListItemSkeleton';
import DeviceListItem from './DeviceListItem';

interface Props {
  items: Device[];
  isLoading: boolean;
  onDeviceSelected: (device: Device) => void;
}

const DeviceList = (props: Props) => {
  const { isLoading } = props;
  const getLoadingSkeleton = () => {
    return Array(10)
      .fill(0)
      .map((n, i) => <DriveListItemSkeleton key={i} />);
  };
  const getItemsList = () =>
    props.items.map((item: Device) => <DeviceListItem key={item.id} device={item} onClick={props.onDeviceSelected} />);

  return (
    <div className="flex flex-col flex-grow bg-white h-full ">
      <div className="files-list font-semibold flex border-b border-l-neutral-30 bg-white text-neutral-500 py-3 text-sm">
        <div className="w-0.5/12 pl-3 flex items-center justify-start box-content"></div>
        <div className="flex-grow flex items-center px-3">{i18n.get('backups.devices-list.columns.name')}</div>
        <div className="w-2/12 hidden items-center xl:flex"></div>
        <div className="w-3/12 hidden items-center lg:flex">{i18n.get('backups.devices-list.columns.last-update')}</div>
        <div className="w-2/12 flex items-center">{i18n.get('backups.devices-list.columns.size')}</div>
      </div>
      <div className="h-full overflow-y-auto">{isLoading ? getLoadingSkeleton() : getItemsList()}</div>
    </div>
  );
};

export default DeviceList;
