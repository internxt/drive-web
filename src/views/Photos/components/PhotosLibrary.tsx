import { PhotoSelection } from '../hooks/usePhotoSelection';
import { Photo, PhotoMonth } from '../types';
import PhotosEmptyState from './PhotosEmptyState';
import PhotosGallery from './PhotosGallery';

interface PhotosLibraryProps {
  months: PhotoMonth[];
  selectedPhotos: PhotoSelection;
  onToggleSelection: (photos: Photo[]) => void;
}

const PhotosLibrary = ({ months, selectedPhotos, onToggleSelection }: PhotosLibraryProps): JSX.Element => {
  const hasPhotos = months.length > 0;
  const galleryKey = months.map((month) => month.folderUuid).join();

  if (!hasPhotos) return <PhotosEmptyState />;
  return (
    <PhotosGallery
      key={galleryKey}
      months={months}
      selectedPhotos={selectedPhotos}
      onToggleSelection={onToggleSelection}
    />
  );
};

export default PhotosLibrary;
