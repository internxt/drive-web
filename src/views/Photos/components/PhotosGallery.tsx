import { useEffect, useMemo, useState } from 'react';
import { PhotoSelection } from '../hooks/usePhotoSelection';
import { TrashedPhotos } from '../hooks/usePhotoTrash';
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
  selectedPhotos: PhotoSelection;
  trashedPhotos: TrashedPhotos;
  onToggleSelection: (photos: Photo[]) => void;
  onMoveToTrash: (photos: Photo[]) => void;
}

const PhotosGallery = ({
  months,
  selectedPhotos,
  trashedPhotos,
  onToggleSelection,
  onMoveToTrash,
}: PhotosGalleryProps): JSX.Element => {
  const { photos, isLoading, hasMoreMonths, failedMonths, loadNextMonth, retryMonths } = useTimelinePhotos(months);
  const photosNewestFirst = useMemo(
    () => sortPhotosNewestFirst(photos.filter(({ uuid }) => !trashedPhotos.has(uuid))),
    [photos, trashedPhotos],
  );
  const [openedPhoto, setOpenedPhoto] = useState<Photo>();
  const isEverythingTrashed = photos.length > 0 && photosNewestFirst.length === 0;

  useEffect(() => {
    if (isEverythingTrashed) loadNextMonth();
  }, [isEverythingTrashed, loadNextMonth]);

  if (photosNewestFirst.length === 0) {
    if (isLoading || (isEverythingTrashed && hasMoreMonths)) return <PhotosGridSkeleton />;
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
        selectedPhotos={selectedPhotos}
        onOpenPhoto={setOpenedPhoto}
        onToggleSelection={onToggleSelection}
      />
      {openedPhoto && (
        <PhotosViewer
          photo={openedPhoto}
          photos={photosNewestFirst}
          onClose={() => setOpenedPhoto(undefined)}
          onMoveToTrash={onMoveToTrash}
        />
      )}
    </>
  );
};

export default PhotosGallery;
