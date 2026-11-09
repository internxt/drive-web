import { useCallback, useEffect, useMemo, useState } from 'react';
import errorService from 'services/error.service';
import { PhotoFoldersService } from '../services/photoFolders.service';
import { Photo, PhotoMonth } from '../types';
import { getUniqueMonthKeysNewestFirst } from '../utils/monthKeys';

export type TimelineStatus = 'loading' | 'error' | 'loaded';

export const useTimelinePhotos = (months: PhotoMonth[]) => {
  const monthKeys = useMemo(() => getUniqueMonthKeysNewestFirst(months), [months]);
  const [requestedMonthsCount, setRequestedMonthsCount] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const [status, setStatus] = useState<TimelineStatus>('loading');
  const [photosByMonth, setPhotosByMonth] = useState<Record<string, Photo[]>>({});
  const monthToLoad = monthKeys[requestedMonthsCount - 1];
  const hasMoreMonths = requestedMonthsCount < monthKeys.length;

  useEffect(() => {
    let isLatestLoad = true;

    const loadMonth = async () => {
      setStatus('loading');

      try {
        const foldersOfMonth = months.filter((month) => month.key === monthToLoad);
        const photosPerFolder = await Promise.all(
          foldersOfMonth.map((folder) => PhotoFoldersService.instance.getMonthPhotos(folder)),
        );
        if (!isLatestLoad) return;
        setPhotosByMonth((current) => ({ ...current, [monthToLoad]: photosPerFolder.flat() }));
        setStatus('loaded');
      } catch (error) {
        if (!isLatestLoad) return;
        errorService.reportError(error);
        setStatus('error');
      }
    };

    void loadMonth();

    return () => {
      isLatestLoad = false;
    };
  }, [months, monthToLoad, retryCount]);

  const loadNextMonth = useCallback(() => {
    if (status === 'loaded' && hasMoreMonths) setRequestedMonthsCount(requestedMonthsCount + 1);
  }, [status, hasMoreMonths, requestedMonthsCount]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  const photos = useMemo(() => Object.values(photosByMonth).flat(), [photosByMonth]);

  return { status, photos, hasMoreMonths, loadNextMonth, retry };
};
