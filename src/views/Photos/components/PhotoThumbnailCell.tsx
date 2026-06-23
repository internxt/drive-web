import { useEffect, useRef, useState } from 'react';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { downloadThumbnail } from 'app/drive/services/thumbnail.service';
import iconService from 'app/drive/services/icon.service';

interface PhotoThumbnailCellProps {
  photo: DriveFileData;
  onClick: (photo: DriveFileData) => void;
}

export default function PhotoThumbnailCell({ photo, onClick }: Readonly<PhotoThumbnailCellProps>): JSX.Element {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const cellRef = useRef<HTMLButtonElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!photo.thumbnails || photo.thumbnails.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadedRef.current) {
          loadedRef.current = true;
          observer.disconnect();
          let cancelled = false;
          downloadThumbnail(photo.thumbnails[0], false)
            .then((blob) => {
              if (!cancelled) {
                const url = URL.createObjectURL(blob);
                blobUrlRef.current = url;
                setThumbnailUrl(url);
              }
            })
            .catch(() => undefined);

          return () => {
            cancelled = true;
          };
        }
      },
      { rootMargin: '200px' },
    );

    if (cellRef.current) observer.observe(cellRef.current);

    return () => {
      observer.disconnect();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [photo.uuid]);

  const ext = photo.type ?? '';
  const ItemIconComponent = iconService.getItemIcon(false, ext);

  return (
    <button
      ref={cellRef}
      className="group relative aspect-square w-full overflow-hidden bg-gray-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={() => onClick(photo)}
      aria-label={photo.plainName ?? photo.plain_name ?? photo.name}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="h-full w-full object-cover transition-opacity duration-200"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ItemIconComponent className="h-10 w-10 opacity-40" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
    </button>
  );
}
