import { PhotoMonth } from '../types';
import PhotosEmptyState from './PhotosEmptyState';
import PhotosGallery from './PhotosGallery';

interface PhotosLibraryProps {
  months: PhotoMonth[];
}

const PhotosLibrary = ({ months }: PhotosLibraryProps): JSX.Element => {
  const hasPhotos = months.length > 0;
  const galleryKey = months.map((month) => month.folderUuid).join();

  if (!hasPhotos) return <PhotosEmptyState />;
  return <PhotosGallery key={galleryKey} months={months} />;
};

export default PhotosLibrary;
