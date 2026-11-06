import { useState } from 'react';
import PhotosDeviceFilter from './components/PhotosDeviceFilter';
import PhotosEmptyState from './components/PhotosEmptyState';
import PhotosErrorState from './components/PhotosErrorState';
import PhotosGridSkeleton from './components/PhotosGridSkeleton';
import PhotosLayout from './components/PhotosLayout';
import { usePhotoDevices } from './hooks/usePhotoDevices';

const PhotosView = (): JSX.Element => {
  const { state, retry } = usePhotoDevices();
  const [selectedDeviceUuid, setSelectedDeviceUuid] = useState<string | null>(null);

  const devices = state.status === 'loaded' ? state.devices : [];
  const hasSeveralDevices = devices.length > 1;

  const content = {
    loading: <PhotosGridSkeleton />,
    error: <PhotosErrorState onRetry={retry} />,
    // TODO: show the photos of the chosen devices when there are devices, once the gallery is added
    loaded: devices.length === 0 && <PhotosEmptyState />,
  };

  return (
    <PhotosLayout
      filters={
        hasSeveralDevices && (
          <PhotosDeviceFilter
            devices={devices}
            selectedDeviceUuid={selectedDeviceUuid}
            onSelect={setSelectedDeviceUuid}
          />
        )
      }
    >
      {content[state.status]}
    </PhotosLayout>
  );
};

export default PhotosView;
