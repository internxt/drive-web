import { useMonthPhotos } from '../hooks/useMonthPhotos';
import { PhotoMonth } from '../types';
import PhotosErrorState from './PhotosErrorState';
import PhotosGridSkeleton from './PhotosGridSkeleton';
import PhotosTimeline from './PhotosTimeline';

interface PhotosGalleryProps {
  months: PhotoMonth[];
}

const PhotosGallery = ({ months }: PhotosGalleryProps): JSX.Element => {
  const { state, photos, retry } = useMonthPhotos(months);

  const content = {
    loading: <PhotosGridSkeleton />,
    error: <PhotosErrorState onRetry={retry} />,
    loaded: <PhotosTimeline photos={photos} />,
  };

  return <>{content[state.status]}</>;
};

export default PhotosGallery;
