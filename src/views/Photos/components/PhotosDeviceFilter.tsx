import { DeviceMobileIcon } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { PhotoDevice } from '../types';
import PhotosFilterMenu from './PhotosFilterMenu';

interface PhotosDeviceFilterProps {
  devices: PhotoDevice[];
  selectedDeviceUuid: string | null;
  onSelect: (deviceUuid: string | null) => void;
}

const PhotosDeviceFilter = ({ devices, selectedDeviceUuid, onSelect }: PhotosDeviceFilterProps): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <PhotosFilterMenu
      allLabel={translate('views.photos.filters.allDevices')}
      options={devices.map((device) => ({
        id: device.uuid,
        label: device.name,
        icon: <DeviceMobileIcon size={20} className="shrink-0 text-gray-60" />,
      }))}
      selectedId={selectedDeviceUuid}
      onSelect={onSelect}
    />
  );
};

export default PhotosDeviceFilter;
