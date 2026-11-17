import { PhotoSelection } from '../hooks/usePhotoSelection';
import { TrashedPhotos } from '../hooks/usePhotoTrash';
import { Photo, PhotoMonth } from '../types';
import { getShownMonthsKey } from '../utils/monthKeys';
import PhotosEmptyState from './PhotosEmptyState';
import PhotosGallery from './PhotosGallery';

interface PhotosLibraryProps {
  months: PhotoMonth[];
  selectedPhotos: PhotoSelection;
  trashedPhotos: TrashedPhotos;
  galleryReloads: number;
  onToggleSelection: (photos: Photo[]) => void;
  onMoveToTrash: (photos: Photo[]) => void;
}

const PhotosLibrary = ({
  months,
  selectedPhotos,
  trashedPhotos,
  galleryReloads,
  onToggleSelection,
  onMoveToTrash,
}: PhotosLibraryProps): JSX.Element => {
  const hasPhotos = months.length > 0;
  const galleryKey = `${getShownMonthsKey(months)}#${galleryReloads}`;

  if (!hasPhotos) return <PhotosEmptyState />;
  return (
    <PhotosGallery
      key={galleryKey}
      months={months}
      selectedPhotos={selectedPhotos}
      trashedPhotos={trashedPhotos}
      onToggleSelection={onToggleSelection}
      onMoveToTrash={onMoveToTrash}
    />
  );
};

export default PhotosLibrary;
