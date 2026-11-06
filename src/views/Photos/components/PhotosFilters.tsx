import { PhotoFilters } from '../hooks/usePhotoFilters';
import { PhotoDevice } from '../types';
import PhotosDeviceFilter from './PhotosDeviceFilter';
import PhotosMonthFilter from './PhotosMonthFilter';

interface PhotosFiltersProps {
  devices: PhotoDevice[];
  filters: PhotoFilters;
}

const PhotosFilters = ({ devices, filters }: PhotosFiltersProps): JSX.Element => {
  const canFilterByDevice = devices.length >= 2;
  const hasMonths = filters.availableMonths.length > 0;

  return (
    <>
      {canFilterByDevice && (
        <PhotosDeviceFilter
          devices={devices}
          selectedDeviceUuid={filters.selectedDeviceUuid}
          onSelect={filters.onSelectDevice}
        />
      )}
      {hasMonths && (
        <PhotosMonthFilter
          months={filters.availableMonths}
          selectedMonth={filters.selectedMonth}
          onSelect={filters.onSelectMonth}
        />
      )}
    </>
  );
};

export default PhotosFilters;
