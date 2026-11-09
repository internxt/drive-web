import { MonthKey } from '../types';
import PhotosEmptyState from './PhotosEmptyState';

interface PhotosLibraryProps {
  months: MonthKey[];
}

const PhotosLibrary = ({ months }: PhotosLibraryProps): JSX.Element | null => {
  const hasPhotos = months.length > 0;

  if (!hasPhotos) return <PhotosEmptyState />;
  return null;
};

export default PhotosLibrary;
