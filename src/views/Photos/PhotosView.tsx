import PhotosErrorState from './components/PhotosErrorState';
import PhotosFilters from './components/PhotosFilters';
import PhotosGridSkeleton from './components/PhotosGridSkeleton';
import PhotosLayout from './components/PhotosLayout';
import PhotosLibrary from './components/PhotosLibrary';
import { usePhotoFilters } from './hooks/usePhotoFilters';
import { usePhotoLibrary } from './hooks/usePhotoLibrary';
import { PhotoDevice, PhotoMonth } from './types';

const NO_DEVICES: PhotoDevice[] = [];
const NO_MONTHS: PhotoMonth[] = [];

const PhotosView = (): JSX.Element => {
  const { state, retry } = usePhotoLibrary();
  const devices = state.status === 'loaded' ? state.devices : NO_DEVICES;
  const filters = usePhotoFilters(state.status === 'loaded' ? state.months : NO_MONTHS);

  const content = {
    loading: <PhotosGridSkeleton />,
    error: <PhotosErrorState onRetry={retry} />,
    loaded: <PhotosLibrary months={filters.shownMonths} />,
  };

  return (
    <PhotosLayout filters={<PhotosFilters devices={devices} filters={filters} />}>{content[state.status]}</PhotosLayout>
  );
};

export default PhotosView;
