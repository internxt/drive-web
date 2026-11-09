import iconService from 'app/drive/services/icon.service';
import { memo } from 'react';
import { Photo } from '../types';

interface PhotoTileProps {
  photo: Photo;
}

const PhotoTile = ({ photo }: PhotoTileProps): JSX.Element => {
  const FileIcon = iconService.getItemIcon(false, photo.type);

  return (
    <div
      role="img"
      aria-label={photo.name}
      className="flex aspect-square items-center justify-center overflow-hidden rounded bg-gray-5 dark:bg-gray-10"
    >
      <FileIcon className="h-16 w-16 drop-shadow-soft" />
    </div>
  );
};

export default memo(PhotoTile);
