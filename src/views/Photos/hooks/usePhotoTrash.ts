import { useCallback, useEffect, useRef, useState } from 'react';
import { moveItemsToTrash } from 'views/Trash/services';
import { getPhotoFiles } from '../services/photoFolders.service';
import { Photo } from '../types';

export type TrashedPhotos = ReadonlySet<string>;

const NOTHING_TRASHED: TrashedPhotos = new Set();

/**
 * @param shownMonthsKey the months the gallery shows: each time they change, the gallery loads them again without the
 * photos in the trash, so undoing after any change, even back to the same filter, reloads the gallery to bring the
 * restored photos back.
 */
export const usePhotoTrash = (shownMonthsKey: string) => {
  const [trashedPhotos, setTrashedPhotos] = useState(NOTHING_TRASHED);
  const [galleryReloads, setGalleryReloads] = useState(0);
  const shownMonthsChanges = useRef(0);
  const lastShownMonthsKey = useRef(shownMonthsKey);

  useEffect(() => {
    if (shownMonthsKey === lastShownMonthsKey.current) return;
    lastShownMonthsKey.current = shownMonthsKey;
    shownMonthsChanges.current += 1;
  }, [shownMonthsKey]);

  const moveToTrash = useCallback((photos: Photo[], onTrashed?: () => void) => {
    const uuids = photos.map(({ uuid }) => uuid);
    const shownMonthsChangesWhenTrashed = shownMonthsChanges.current;

    void moveItemsToTrash(
      getPhotoFiles(photos),
      () => {
        setTrashedPhotos((trashed) => new Set([...trashed, ...uuids]));
        onTrashed?.();
      },
      () => {
        setTrashedPhotos((trashed) => new Set([...trashed].filter((uuid) => !uuids.includes(uuid))));
        const hasFilterChanged = shownMonthsChanges.current !== shownMonthsChangesWhenTrashed;
        if (hasFilterChanged) setGalleryReloads((reloads) => reloads + 1);
      },
    );
  }, []);

  return { trashedPhotos, galleryReloads, moveToTrash };
};
