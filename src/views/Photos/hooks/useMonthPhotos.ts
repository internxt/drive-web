import { useCallback, useEffect, useState } from 'react';
import errorService from 'services/error.service';
import { PhotoFoldersService } from '../services/photoFolders.service';
import { Photo, PhotoMonth } from '../types';

const NO_PHOTOS: Photo[] = [];

export type MonthPhotosState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; photos: Photo[] };

export const useMonthPhotos = (months: PhotoMonth[]) => {
  const [state, setState] = useState<MonthPhotosState>({ status: 'loading' });

  const loadPhotos = useCallback(async () => {
    setState({ status: 'loading' });

    try {
      const photosPerMonth = await Promise.all(
        months.map((month) => PhotoFoldersService.instance.getMonthPhotos(month)),
      );
      setState({ status: 'loaded', photos: photosPerMonth.flat() });
    } catch (error) {
      errorService.reportError(error);
      setState({ status: 'error' });
    }
  }, [months]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  const photos = state.status === 'loaded' ? state.photos : NO_PHOTOS;

  return { state, photos, retry: loadPhotos };
};
