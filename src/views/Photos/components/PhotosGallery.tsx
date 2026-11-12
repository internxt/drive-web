import { useTimelinePhotos } from '../hooks/useTimelinePhotos';
import { PhotoMonth } from '../types';
import PhotosEmptyState from './PhotosEmptyState';
import PhotosErrorState from './PhotosErrorState';
import PhotosGridSkeleton from './PhotosGridSkeleton';
import PhotosTimeline from './PhotosTimeline';

interface PhotosGalleryProps {
  months: PhotoMonth[];
}

const PhotosGallery = ({ months }: PhotosGalleryProps): JSX.Element => {
  const { photos, isLoading, hasMoreMonths, failedMonths, loadNextMonth, retryMonths } = useTimelinePhotos(months);
  if (photos.length === 0) {
    if (isLoading) return <PhotosGridSkeleton />;
    if (failedMonths.length > 0) return <PhotosErrorState onRetry={() => retryMonths(failedMonths)} />;
    return <PhotosEmptyState />;
  }

  return (
    <PhotosTimeline
      photos={photos}
      failedMonths={failedMonths}
      isLoadingMore={isLoading || hasMoreMonths}
      onEndReached={loadNextMonth}
      onRetryMonth={(month) => retryMonths([month])}
    />
  );
};

export default PhotosGallery;
