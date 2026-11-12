import PhotosErrorState from './components/PhotosErrorState';
import PhotosFilters from './components/PhotosFilters';
import PhotosGridSkeleton from './components/PhotosGridSkeleton';
import PhotosLayout from './components/PhotosLayout';
import PhotosLibrary from './components/PhotosLibrary';
import PhotosSelectionHeader from './components/PhotosSelectionHeader';
import { usePhotoFilters } from './hooks/usePhotoFilters';
import { usePhotoLibrary } from './hooks/usePhotoLibrary';
import { usePhotoSelection } from './hooks/usePhotoSelection';
import { PhotoDevice, PhotoMonth } from './types';

const NO_DEVICES: PhotoDevice[] = [];
const NO_MONTHS: PhotoMonth[] = [];

const PhotosView = (): JSX.Element => {
  const { state, retry } = usePhotoLibrary();
  const devices = state.status === 'loaded' ? state.devices : NO_DEVICES;
  const filters = usePhotoFilters(state.status === 'loaded' ? state.months : NO_MONTHS);
  const { selectedPhotos, toggleSelection, clearSelection } = usePhotoSelection();

  const content = {
    loading: <PhotosGridSkeleton />,
    error: <PhotosErrorState onRetry={retry} />,
    loaded: (
      <PhotosLibrary months={filters.shownMonths} selectedPhotos={selectedPhotos} onToggleSelection={toggleSelection} />
    ),
  };

  return (
    <PhotosLayout
      filters={<PhotosFilters devices={devices} filters={filters} />}
      selectionHeader={
        selectedPhotos.size > 0 ? (
          <PhotosSelectionHeader selectedPhotos={selectedPhotos} onClear={clearSelection} />
        ) : undefined
      }
    >
      {content[state.status]}
    </PhotosLayout>
  );
};

export default PhotosView;
