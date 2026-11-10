import { useCallback, useState } from 'react';
import { moveItemsToTrash } from 'views/Trash/services';
import { Photo } from '../types';

export type TrashedPhotos = ReadonlySet<string>;

const NOTHING_TRASHED: TrashedPhotos = new Set();

export const usePhotoTrash = () => {
  const [trashedPhotos, setTrashedPhotos] = useState(NOTHING_TRASHED);

  const moveToTrash = useCallback((photos: Photo[], onTrashed?: () => void) => {
    const uuids = photos.map(({ uuid }) => uuid);
    const files = photos.flatMap(({ file, relatedFiles }) => [file, ...relatedFiles.map((related) => related.file)]);

    void moveItemsToTrash(
      files,
      () => {
        setTrashedPhotos((trashed) => new Set([...trashed, ...uuids]));
        onTrashed?.();
      },
      () => setTrashedPhotos((trashed) => new Set([...trashed].filter((uuid) => !uuids.includes(uuid)))),
    );
  }, []);

  return { trashedPhotos, moveToTrash };
};
