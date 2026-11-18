import { PhotoFilters } from '../hooks/usePhotoFilters';
import { PhotoDevice } from '../types';
import PhotosDeviceFilter from './PhotosDeviceFilter';
import PhotosMonthFilter from './PhotosMonthFilter';

interface PhotosFiltersProps {
  devices: PhotoDevice[];
  filters: PhotoFilters;
}

const PhotosFilters = ({ devices, filters }: PhotosFiltersProps): JSX.Element => {
  const hasSeveralDevices = devices.length > 1;
  const hasMonths = filters.availableMonths.length > 0;

  return (
    <>
      {hasSeveralDevices && (
        <PhotosDeviceFilter
          devices={devices}
          selectedDeviceUuid={filters.selectedDeviceUuid}
          onSelect={filters.selectDevice}
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
