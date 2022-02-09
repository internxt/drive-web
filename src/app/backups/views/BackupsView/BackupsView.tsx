import { useEffect } from 'react';
import UilHdd from '@iconscout/react-unicons/icons/uil-hdd';

import DeviceList from '../../components/DeviceList/DeviceList';
import i18n from 'app/i18n/services/i18n.service';
import { Device } from '../../types';
import BackupsList from '../../components/BackupList/BackupList';
import Breadcrumbs, { BreadcrumbItemData } from 'app/shared/components/Breadcrumbs/Breadcrumbs';
import { backupsActions, backupsThunks } from 'app/store/slices/backups';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

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
      icon: <UilHdd className="w-4 h-4 mr-1" />,
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
  const onDeviceSelected = (target: Device | DriveFolderData) => {
    if ('mac' in target) {
      dispatch(backupsActions.setCurrentDevice(target));
      dispatch(backupsThunks.fetchDeviceBackupsThunk(target.mac));
    }
  };
  const goBack = () => {
    dispatch(backupsActions.setCurrentDevice(null));
  };

  const onDeviceDeleted = (target: Device | DriveFolderData) => {
    if ('mac' in target) dispatch(backupsThunks.deleteDeviceThunk(target));
  };

  useEffect(() => {
    dispatch(backupsThunks.fetchDevicesThunk());
  }, []);

  return (
    <div className="flex flex-col flex-grow pt-6 px-8 mb-5">
      <div className="pb-4 flex items-baseline">
        {currentDevice ? backupsBreadcrumbs : <p className="text-lg px-3 py-1"> {i18n.get('backups.your-devices')}</p>}
      </div>
      {currentDevice ? (
        <BackupsList isLoading={isLoadingDeviceBackups} items={currentDeviceBackups} />
      ) : (
        <DeviceList
          isLoading={isLoadingDevices}
          items={devices}
          onDeviceSelected={onDeviceSelected}
          onDeviceDeleted={onDeviceDeleted}
        />
      )}
    </div>
  );
}
