import { useCallback, useState } from 'react';
import { moveItemsToTrash } from 'views/Trash/services';
import { getPhotoFiles } from '../services/photoFolders.service';
import { Photo } from '../types';

export type TrashedPhotos = ReadonlySet<string>;

const NOTHING_TRASHED: TrashedPhotos = new Set();

export const usePhotoTrash = () => {
  const [trashedPhotos, setTrashedPhotos] = useState(NOTHING_TRASHED);

  const moveToTrash = useCallback((photos: Photo[], onTrashed?: () => void) => {
    const uuids = photos.map(({ uuid }) => uuid);

    void moveItemsToTrash(
      getPhotoFiles(photos),
      () => {
        setTrashedPhotos((trashed) => new Set([...trashed, ...uuids]));
        onTrashed?.();
      },
      () => setTrashedPhotos((trashed) => new Set([...trashed].filter((uuid) => !uuids.includes(uuid)))),
    );
  }, []);

  return { trashedPhotos, moveToTrash };
};
