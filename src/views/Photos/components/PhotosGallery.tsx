import { useMemo, useState } from 'react';
import { useTimelinePhotos } from '../hooks/useTimelinePhotos';
import { Photo, PhotoMonth } from '../types';
import { sortPhotosNewestFirst } from '../utils/photoTimeline';
import PhotosEmptyState from './PhotosEmptyState';
import PhotosErrorState from './PhotosErrorState';
import PhotosGridSkeleton from './PhotosGridSkeleton';
import PhotosTimeline from './PhotosTimeline';
import PhotosViewer from './PhotosViewer';

interface PhotosGalleryProps {
  months: PhotoMonth[];
}

const PhotosGallery = ({ months }: PhotosGalleryProps): JSX.Element => {
  const { photos, isLoading, hasMoreMonths, failedMonths, loadNextMonth, retryMonths } = useTimelinePhotos(months);
  const photosNewestFirst = useMemo(() => sortPhotosNewestFirst(photos), [photos]);
  const [openedPhoto, setOpenedPhoto] = useState<Photo>();

  if (photos.length === 0) {
    if (isLoading) return <PhotosGridSkeleton />;
    if (failedMonths.length > 0) return <PhotosErrorState onRetry={() => retryMonths(failedMonths)} />;
    return <PhotosEmptyState />;
  }

  return (
    <>
      <PhotosTimeline
        photos={photosNewestFirst}
        failedMonths={failedMonths}
        isLoadingMore={isLoading || hasMoreMonths}
        onEndReached={loadNextMonth}
        onRetryMonth={(month) => retryMonths([month])}
        onOpenPhoto={setOpenedPhoto}
      />
      {openedPhoto && (
        <PhotosViewer photo={openedPhoto} photos={photosNewestFirst} onClose={() => setOpenedPhoto(undefined)} />
      )}
    </>
  );
};

export default PhotosGallery;
