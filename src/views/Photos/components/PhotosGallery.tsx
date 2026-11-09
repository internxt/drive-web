import { TimelineStatus, useTimelinePhotos } from '../hooks/useTimelinePhotos';
import { PhotoMonth } from '../types';
import PhotosErrorState from './PhotosErrorState';
import PhotosGridSkeleton from './PhotosGridSkeleton';
import PhotosTimeline, { TimelineEnd } from './PhotosTimeline';

interface PhotosGalleryProps {
  months: PhotoMonth[];
}

const getTimelineEnd = (status: TimelineStatus, hasMoreMonths: boolean): TimelineEnd => {
  if (status === 'error') return 'error';
  if (status === 'loading' || hasMoreMonths) return 'loading';
  return null;
};

const PhotosGallery = ({ months }: PhotosGalleryProps): JSX.Element => {
  const { status, photos, hasMoreMonths, loadNextMonth, retry } = useTimelinePhotos(months);
  const hasPhotos = photos.length > 0;

  if (!hasPhotos && status === 'error') return <PhotosErrorState onRetry={retry} />;
  if (!hasPhotos && status === 'loading') return <PhotosGridSkeleton />;

  return (
    <PhotosTimeline
      photos={photos}
      end={getTimelineEnd(status, hasMoreMonths)}
      onEndReached={loadNextMonth}
      onRetry={retry}
    />
  );
};

export default PhotosGallery;
