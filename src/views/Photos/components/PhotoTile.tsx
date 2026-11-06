import iconService from 'app/drive/services/icon.service';
import { memo, useRef } from 'react';
import { useIsNearViewport } from '../hooks/useIsNearViewport';
import { PhotoThumbnailState, usePhotoThumbnail } from '../hooks/usePhotoThumbnail';
import { Photo } from '../types';

const THUMBNAIL_PRELOAD_MARGIN = '400px';

interface PhotoTileProps {
  photo: Photo;
}

const renderTileContent = (photo: Photo, thumbnail: PhotoThumbnailState): JSX.Element => {
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

const PhotoTile = ({ photo }: PhotoTileProps): JSX.Element => {
  const tileRef = useRef<HTMLDivElement>(null);
  const isNearViewport = useIsNearViewport(tileRef, THUMBNAIL_PRELOAD_MARGIN);
  const thumbnail = usePhotoThumbnail(photo, isNearViewport);

  return (
    <div
      ref={tileRef}
      role="img"
      aria-label={photo.name}
      className="aspect-square overflow-hidden rounded bg-gray-5 dark:bg-gray-10"
    >
      {renderTileContent(photo, thumbnail)}
    </div>
  );
};

export default memo(PhotoTile);
