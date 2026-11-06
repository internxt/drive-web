import { useCallback, useEffect, useMemo, useState } from 'react';
import errorService from 'services/error.service';
import { PhotoFoldersService } from '../services/photoFolders.service';
import { MonthKey, Photo, PhotoMonth } from '../types';

export type TimelineStatus = 'loading' | 'error' | 'loaded';

const getMonthKeysNewestFirst = (months: PhotoMonth[]): MonthKey[] =>
  [...new Set(months.map((month) => month.key))].sort((month, otherMonth) => otherMonth.localeCompare(month));

export const useTimelinePhotos = (months: PhotoMonth[], isEndOfTimelineNear: boolean) => {
  const [status, setStatus] = useState<TimelineStatus>('loading');
  const [photosByMonth, setPhotosByMonth] = useState<Record<string, Photo[]>>({});
  const [shownMonthsCount, setShownMonthsCount] = useState(1);
  const monthKeys = useMemo(() => getMonthKeysNewestFirst(months), [months]);
  const lastShownMonth = monthKeys[shownMonthsCount - 1];
  const hasMoreMonths = shownMonthsCount < monthKeys.length;
  const shouldShowNextMonth = isEndOfTimelineNear && status === 'loaded' && hasMoreMonths;

  const loadLastShownMonth = useCallback(async () => {
    setStatus('loading');

    try {
      const foldersOfMonth = months.filter((month) => month.key === lastShownMonth);
      const photosPerFolder = await Promise.all(
        foldersOfMonth.map((folder) => PhotoFoldersService.instance.getMonthPhotos(folder)),
      );
      setPhotosByMonth((current) => ({ ...current, [lastShownMonth]: photosPerFolder.flat() }));
      setStatus('loaded');
    } catch (error) {
      errorService.reportError(error);
      setStatus('error');
    }
  }, [months, lastShownMonth]);

  useEffect(() => {
    void loadLastShownMonth();
  }, [loadLastShownMonth]);

  useEffect(() => {
    if (shouldShowNextMonth) setShownMonthsCount((count) => count + 1);
  }, [shouldShowNextMonth]);

  const photos = useMemo(() => Object.values(photosByMonth).flat(), [photosByMonth]);

  return { status, photos, retry: loadLastShownMonth };
};
