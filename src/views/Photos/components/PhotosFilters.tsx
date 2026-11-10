import { PhotoFilters } from '../hooks/usePhotoFilters';
import { PhotoDevice } from '../types';
import PhotosDeviceFilter from './PhotosDeviceFilter';
import PhotosMonthFilter from './PhotosMonthFilter';

interface PhotosFiltersProps {
  devices: PhotoDevice[];
  filters: PhotoFilters;
  onDeviceRemoved: (deviceUuid: string) => void;
}

const PhotosFilters = ({ devices, filters, onDeviceRemoved }: PhotosFiltersProps): JSX.Element => {
  const hasDevices = devices.length > 0;
  const hasMonths = filters.availableMonths.length > 0;

  return (
    <>
      {hasDevices && (
        <PhotosDeviceFilter
          devices={devices}
          selectedDeviceUuid={filters.selectedDeviceUuid}
          onSelect={filters.selectDevice}
          onDeviceRemoved={onDeviceRemoved}
        />
      )}
      {hasMonths && (
        <PhotosMonthFilter
          months={filters.availableMonths}
          selectedMonth={filters.selectedMonth}
          onSelect={filters.selectMonth}
        />
      )}
    </>
  );
};

export default PhotosFilters;
