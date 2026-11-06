import { useRef } from 'react';
import { useIsNearViewport } from '../hooks/useIsNearViewport';
import { useTimelinePhotos } from '../hooks/useTimelinePhotos';
import { PhotoMonth } from '../types';
import PhotosErrorState from './PhotosErrorState';
import PhotosGridSkeleton from './PhotosGridSkeleton';
import PhotosTimeline from './PhotosTimeline';

const NEXT_MONTH_PRELOAD_MARGIN = '800px';

interface PhotosGalleryProps {
  months: PhotoMonth[];
}

const PhotosGallery = ({ months }: PhotosGalleryProps): JSX.Element => {
  const endOfTimelineRef = useRef<HTMLDivElement>(null);
  const isEndOfTimelineNear = useIsNearViewport(endOfTimelineRef, NEXT_MONTH_PRELOAD_MARGIN);
  const { status, photos, retry } = useTimelinePhotos(months, isEndOfTimelineNear);
  const hasPhotos = photos.length > 0;

  const content = {
    loading: <PhotosGridSkeleton />,
    error: <PhotosErrorState onRetry={retry} />,
    loaded: null,
  };

  return (
    <>
      {hasPhotos && <PhotosTimeline photos={photos} />}
      {content[status]}
      <div ref={endOfTimelineRef} aria-hidden className="h-px shrink-0" />
    </>
  );
};

export default PhotosGallery;
