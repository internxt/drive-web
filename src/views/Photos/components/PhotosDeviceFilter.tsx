import { DeviceMobileIcon, GearSixIcon } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useState } from 'react';
import { PhotoDevice } from '../types';
import ManageDevicesDialog from './ManageDevicesDialog';
import PhotosFilterMenu from './PhotosFilterMenu';

interface PhotosDeviceFilterProps {
  devices: PhotoDevice[];
  selectedDeviceUuid: string | null;
  onSelect: (deviceUuid: string | null) => void;
  onDeviceRemoved: (deviceUuid: string) => void;
}

const PhotosDeviceFilter = ({
  devices,
  selectedDeviceUuid,
  onSelect,
  onDeviceRemoved,
}: PhotosDeviceFilterProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const [isManagingDevices, setIsManagingDevices] = useState(false);

  return (
    <>
      <PhotosFilterMenu
        allLabel={translate('views.photos.filters.allDevices')}
        options={devices.map((device) => ({
          id: device.uuid,
          label: device.name,
          icon: <DeviceMobileIcon size={20} className="shrink-0 text-gray-60" />,
        }))}
        selectedId={selectedDeviceUuid}
        onSelect={onSelect}
        action={{
          label: translate('views.photos.devices.manage'),
          icon: <GearSixIcon size={20} className="shrink-0 text-gray-60" />,
          onClick: () => setIsManagingDevices(true),
        }}
      />
      <ManageDevicesDialog
        isOpen={isManagingDevices}
        devices={devices}
        onClose={() => setIsManagingDevices(false)}
        onDeviceRemoved={onDeviceRemoved}
      />
    </>
  );
};

export default PhotosDeviceFilter;
