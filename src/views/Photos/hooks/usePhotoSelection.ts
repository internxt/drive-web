import { useCallback, useState } from 'react';
import { Photo } from '../types';

export type PhotoSelection = ReadonlyMap<string, Photo>;

const NO_SELECTION: PhotoSelection = new Map();

export const usePhotoSelection = () => {
  const [selectedPhotos, setSelectedPhotos] = useState(NO_SELECTION);

  const toggleSelection = useCallback((photosToToggle: Photo[]) => {
    setSelectedPhotos((selected) => {
      const isSelectingThem = photosToToggle.some(({ uuid }) => !selected.has(uuid));
      const nextSelected = new Map(selected);
      for (const photo of photosToToggle) {
        if (isSelectingThem) nextSelected.set(photo.uuid, photo);
        else nextSelected.delete(photo.uuid);
      }
      return nextSelected;
    });
  }, []);

  const clearSelection = () => setSelectedPhotos(NO_SELECTION);

  return { selectedPhotos, toggleSelection, clearSelection };
};
