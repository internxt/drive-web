import React, { ReactNode } from 'react';
import { Device } from '../../models/interfaces';
import i18n from '../../services/i18n.service';
import DriveListItemSkeleton from '../loaders/DriveListItemSkeleton';
import DeviceListItem from './DeviceListItem';

interface Props {
  items: Device[] | null;
  isLoading: boolean;
  onSelected: (device: Device) => void;
}

export default class DeviceList extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
  }

  get hasItems(): boolean {
    return !!this.props.items && this.props.items.length > 0;
  }

  get itemsList(): JSX.Element[] {
    if (this.props.items === null) return [];
    return this.props.items.map((item: Device) => (
      <DeviceListItem key={item.id} device={item} onClick={this.props.onSelected} />
    ));
  }

  get loadingSkeleton(): JSX.Element[] {
    return Array(10)
      .fill(0)
      .map((n, i) => <DriveListItemSkeleton key={i} />);
  }

  render(): ReactNode {
    const { isLoading } = this.props;

    return (
      <div className="flex flex-col flex-grow bg-white h-full ">
        <div className="files-list font-semibold flex border-b border-l-neutral-30 bg-white text-neutral-500 py-3 text-sm">
          <div className="w-0.5/12 pl-3 flex items-center justify-start box-content"></div>
          <div className="flex-grow flex items-center px-3">{i18n.get('backups.devices-list.columns.name')}</div>
          <div className="w-2/12 hidden items-center xl:flex"></div>
          <div className="w-3/12 hidden items-center lg:flex">
            {i18n.get('backups.devices-list.columns.last-update')}
          </div>
          <div className="w-2/12 flex items-center">{i18n.get('backups.devices-list.columns.size')}</div>
        </div>
        <div className="h-full overflow-y-auto">{isLoading ? this.loadingSkeleton : this.itemsList}</div>
      </div>
    );
  }
}
