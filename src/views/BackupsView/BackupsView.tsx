import { useEffect } from 'react';
import BackupsList from '../../components/BackupsList/BackupsList';
import DeviceList from '../../components/DeviceList/DeviceList';
import { Device } from '../../models/interfaces';
import i18n from '../../services/i18n.service';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { backupsActions, backupsThunks } from '../../store/slices/backups';

export default function BackupsView(): JSX.Element {
  const dispatch = useAppDispatch();
  const isLoadingDevices = useAppSelector((state) => state.backups.isLoadingDevices);
  const isLoadingDeviceBackups = useAppSelector((state) => state.backups.isLoadingDeviceBackups);
  const devices = useAppSelector((state) => state.backups.devices);
  const currentDeviceBackups = useAppSelector((state) => state.backups.backups);
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);
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
        <p className="text-lg px-3 py-1">
          {currentDevice
            ? i18n.get('backups.backups-from', { deviceName: currentDevice.name })
            : i18n.get('backups.your-devices')}
        </p>
        {currentDevice && (
          <p className="text-blue-50 cursor-pointer py-1 text-sm" onClick={goBack}>
            {i18n.get('backups.back-to-devices')}
          </p>
        )}
      </div>
      {currentDevice ? (
        <BackupsList isLoading={isLoadingDeviceBackups} items={currentDeviceBackups} />
      ) : (
        <DeviceList isLoading={isLoadingDevices} items={devices} onDeviceSelected={onDeviceSelected} />
      )}
    </div>
  );
}
