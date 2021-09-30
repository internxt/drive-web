import { useEffect } from 'react';
import * as Unicons from '@iconscout/react-unicons';

import BackupsList from '../../components/BackupsList/BackupsList';
import DeviceList from '../../components/DeviceList/DeviceList';
import { Device } from '../../models/interfaces';
import i18n from '../../services/i18n.service';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { backupsActions, backupsThunks } from '../../store/slices/backups';
import Breadcrumbs, { BreadcrumbItemData } from '../../components/Breadcrumbs/Breadcrumbs';

export default function BackupsView(): JSX.Element {
  const dispatch = useAppDispatch();
  const isLoadingDevices = useAppSelector((state) => state.backups.isLoadingDevices);
  const isLoadingDeviceBackups = useAppSelector((state) => state.backups.isLoadingDeviceBackups);
  const devices = useAppSelector((state) => state.backups.devices);
  const currentDeviceBackups = useAppSelector((state) => state.backups.backups);
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);
  const breadcrumbsItems: BreadcrumbItemData[] = [
    {
      id: -1,
      label: 'Devices',
      icon: <Unicons.UilHdd className="w-4 h-4 mr-1" />,
      active: true,
      onClick: () => goBack(),
    },
  ];
  breadcrumbsItems.push(
    ...(currentDevice
      ? [
          {
            id: currentDevice.id,
            label: currentDevice.name,
            icon: null,
            active: false,
          },
        ]
      : []),
  );
  const backupsBreadcrumbs = <Breadcrumbs items={breadcrumbsItems} />;
  const onDeviceSelected = (target: Device) => {
    dispatch(backupsActions.setCurrentDevice(target));
    dispatch(backupsThunks.fetchDeviceBackupsThunk(target.mac));
  };
  const goBack = () => {
    dispatch(backupsActions.setCurrentDevice(null));
  };

  useEffect(() => {
    dispatch(backupsThunks.fetchDevicesThunk());
  }, []);

  return (
    <div className="flex-grow pt-6 px-8">
      <div className="pb-4 flex items-baseline">
        {currentDevice ? backupsBreadcrumbs : <p className="text-lg px-3 py-1"> {i18n.get('backups.your-devices')}</p>}
      </div>
      {currentDevice ? (
        <BackupsList isLoading={isLoadingDeviceBackups} items={currentDeviceBackups} />
      ) : (
        <DeviceList isLoading={isLoadingDevices} items={devices} onDeviceSelected={onDeviceSelected} />
      )}
    </div>
  );
}
