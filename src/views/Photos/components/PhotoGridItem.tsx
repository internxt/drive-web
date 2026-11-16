import iconService from 'app/drive/services/icon.service';
import { memo } from 'react';
import { PhotoThumbnailState, usePhotoThumbnail } from '../hooks/usePhotoThumbnail';
import { Photo } from '../types';

interface PhotoGridItemProps {
  photo: Photo;
}

const renderItemContent = (photo: Photo, thumbnail: PhotoThumbnailState): JSX.Element => {
  switch (thumbnail.status) {
    case 'loading':
      return <div className="h-full w-full animate-pulse bg-gray-10 dark:bg-gray-20" />;
    case 'loaded':
      return <img src={thumbnail.url} alt={photo.name} draggable={false} className="h-full w-full object-cover" />;
    case 'unavailable': {
      const FileIcon = iconService.getItemIcon(false, photo.type);
      return (
        <div className="flex h-full w-full items-center justify-center">
          <FileIcon className="h-16 w-16 drop-shadow-soft" />
        </div>
      );
    }
  }
};

const PhotoGridItem = ({ photo }: PhotoGridItemProps): JSX.Element => {
  const thumbnail = usePhotoThumbnail(photo);

  return (
    <div role="img" aria-label={photo.name} className="aspect-square overflow-hidden rounded bg-gray-5 dark:bg-gray-10">
      {renderItemContent(photo, thumbnail)}
    </div>
  );
};

export default memo(PhotoGridItem);
