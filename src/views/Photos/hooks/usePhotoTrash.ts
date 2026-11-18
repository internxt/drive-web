import { useCallback, useEffect, useRef, useState } from 'react';
import { moveItemsToTrash } from 'views/Trash/services';
import { getPhotoFiles } from '../services/photoFolders.service';
import { Photo } from '../types';

export type TrashedPhotos = ReadonlySet<string>;

const NOTHING_TRASHED: TrashedPhotos = new Set();

/**
 * @param shownMonthsKey the months the gallery shows. Each time the gallery loads them again (the filter changed or it
 * was reloaded), it loads them without the photos in the trash, so undoing after any load, even back to the same filter,
 * reloads the gallery to bring the restored photos back. Restored photos are shown once they are back in their folders;
 * if some couldn't be restored, the gallery is reloaded to show only the ones that are.
 */
export const usePhotoTrash = (shownMonthsKey: string) => {
  const [trashedPhotos, setTrashedPhotos] = useState(NOTHING_TRASHED);
  const [galleryReloads, setGalleryReloads] = useState(0);
  const galleryKey = `${shownMonthsKey}#${galleryReloads}`;
  const galleryLoads = useRef(0);
  const lastGalleryKey = useRef(galleryKey);

  useEffect(() => {
    if (galleryKey === lastGalleryKey.current) return;
    lastGalleryKey.current = galleryKey;
    galleryLoads.current += 1;
  }, [galleryKey]);

  const moveToTrash = useCallback((photos: Photo[], onTrashed?: () => void) => {
    const uuids = photos.map(({ uuid }) => uuid);
    const galleryLoadsWhenTrashed = galleryLoads.current;

    return moveItemsToTrash(
      getPhotoFiles(photos),
      () => {
        setTrashedPhotos((trashed) => new Set([...trashed, ...uuids]));
        onTrashed?.();
      },
      (isEverythingRestored) => {
        setTrashedPhotos((trashed) => new Set([...trashed].filter((uuid) => !uuids.includes(uuid))));
        const hasGalleryLoadedAgain = galleryLoads.current !== galleryLoadsWhenTrashed;
        if (hasGalleryLoadedAgain || !isEverythingRestored) setGalleryReloads((reloads) => reloads + 1);
      },
    );
  }, []);

  return { trashedPhotos, galleryKey, moveToTrash };
};
