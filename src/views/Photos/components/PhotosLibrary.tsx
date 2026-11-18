import { PhotoSelection } from '../hooks/usePhotoSelection';
import { TrashedPhotos } from '../hooks/usePhotoTrash';
import { Photo, PhotoMonth } from '../types';
import PhotosEmptyState from './PhotosEmptyState';
import PhotosGallery from './PhotosGallery';

interface PhotosLibraryProps {
  months: PhotoMonth[];
  selectedPhotos: PhotoSelection;
  trashedPhotos: TrashedPhotos;
  galleryKey: string;
  onToggleSelection: (photos: Photo[]) => void;
  onMoveToTrash: (photos: Photo[]) => void;
}

const PhotosLibrary = ({
  months,
  selectedPhotos,
  trashedPhotos,
  galleryKey,
  onToggleSelection,
  onMoveToTrash,
}: PhotosLibraryProps): JSX.Element => {
  const hasPhotos = months.length > 0;

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
