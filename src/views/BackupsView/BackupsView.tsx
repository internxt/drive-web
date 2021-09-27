import { useEffect, useState } from 'react';
import BackupsList from '../../components/BackupsList/BackupsList';
import DeviceList from '../../components/DeviceList/DeviceList';
import { Backup, Device } from '../../models/interfaces';
import backupsService from '../../services/backups.service';

export default function BackupsView(): JSX.Element {
  const [devices, setDevices] = useState<Device[] | null>([]);

  useEffect(() => {
    backupsService.getAllDevices().then(setDevices);
  }, []);

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedDeviceBackups, setSelectedDeviceBackups] = useState<Backup[] | null>(null);

  const onDeviceSelected = (target: Device) => {
    setSelectedDevice(target);
    backupsService.getAllBackups(target.mac).then(setSelectedDeviceBackups);
  };

  const goBack = () => {
    setSelectedDevice(null);
    setSelectedDeviceBackups(null);
  };

  return (
    <div className="pt-6 px-8">
      <div className="pb-4 flex items-baseline">
        <p className="text-lg px-3 py-1">{selectedDevice ? `Backups from ${selectedDevice.name}` : 'Your devices'}</p>
        {selectedDevice && (
          <p className="text-blue-50 cursor-pointer py-1 text-sm" onClick={goBack}>
            Go back to devices
          </p>
        )}
      </div>
      {selectedDevice ? (
        <BackupsList isLoading={selectedDeviceBackups === null} items={selectedDeviceBackups} />
      ) : (
        <DeviceList isLoading={devices === null} items={devices} onSelected={onDeviceSelected} />
      )}
    </div>
  );
}
