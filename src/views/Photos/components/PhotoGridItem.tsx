import { Icon, PlayIcon, StackIcon, TargetIcon } from '@phosphor-icons/react';
import iconService from 'app/drive/services/icon.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { memo, useId } from 'react';
import { PhotoThumbnailState, usePhotoThumbnail } from '../hooks/usePhotoThumbnail';
import { Photo, PhotoKind } from '../types';
import PhotosCheckbox from './PhotosCheckbox';

interface PhotoGridItemProps {
  photo: Photo;
  isSelected: boolean;
  isSelecting: boolean;
  onOpen: (photo: Photo) => void;
  onToggleSelection: (photos: Photo[]) => void;
}

const KIND_BADGES: Partial<Record<PhotoKind, { Icon: Icon; description: string }>> = {
  livePhoto: { Icon: TargetIcon, description: 'views.photos.badges.livePhoto' },
  burst: { Icon: StackIcon, description: 'views.photos.badges.burst' },
  video: { Icon: PlayIcon, description: 'views.photos.badges.video' },
};

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

const PhotoGridItem = ({
  photo,
  isSelected,
  isSelecting,
  onOpen,
  onToggleSelection,
}: PhotoGridItemProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const thumbnail = usePhotoThumbnail(photo);
  const descriptionId = useId();
  const badge = KIND_BADGES[photo.kind];

  return (
    <div className="group relative aspect-square">
      <button
        type="button"
        onClick={() => (isSelecting ? onToggleSelection([photo]) : onOpen(photo))}
        className={`relative block h-full w-full overflow-hidden rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected ? 'after:absolute after:inset-0 after:rounded after:ring-2 after:ring-inset after:ring-primary' : ''}`}
      >
        <div
          role="img"
          aria-label={photo.name}
          aria-describedby={badge ? descriptionId : undefined}
          className="relative h-full w-full bg-gray-5 dark:bg-gray-10"
        >
          {renderItemContent(photo, thumbnail)}
          {badge && (
            <>
              <badge.Icon
                aria-hidden
                size={20}
                weight="fill"
                className="absolute right-1.5 top-1.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              />
              <span id={descriptionId} className="sr-only">
                {translate(badge.description)}
              </span>
            </>
          )}
        </div>
      </button>
      <PhotosCheckbox
        label={photo.name}
        checked={isSelected}
        onChange={() => onToggleSelection([photo])}
        className={`absolute left-1.5 top-1.5 ${isSelecting ? '' : 'opacity-0 focus:opacity-100 group-hover:opacity-100'}`}
      />
    </div>
  );
};

export default memo(PhotoGridItem);
