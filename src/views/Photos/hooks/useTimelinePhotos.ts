import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import errorService from 'services/error.service';
import { PhotoFoldersService } from '../services/photoFolders.service';
import { MonthKey, Photo, PhotoMonth } from '../types';
import { getUniqueMonthKeysNewestFirst } from '../utils/monthKeys';

export const useTimelinePhotos = (months: PhotoMonth[]) => {
  const [requestedMonthsCount, setRequestedMonthsCount] = useState(1);
  const [photosByFolder, setPhotosByFolder] = useState<Record<string, Photo[]>>({});
  const [failedFolders, setFailedFolders] = useState<ReadonlySet<string>>(new Set());
  const foldersBeingLoaded = useRef(new Set<string>());

  const monthKeys = useMemo(() => getUniqueMonthKeysNewestFirst(months), [months]);
  const hasMoreMonths = requestedMonthsCount < monthKeys.length;

  const requestedFolders = useMemo(() => {
    const requestedMonths = monthKeys.slice(0, requestedMonthsCount);
    return months.filter(({ key }) => requestedMonths.includes(key));
  }, [months, monthKeys, requestedMonthsCount]);

  const foldersToLoad = useMemo(
    () => requestedFolders.filter(({ folderUuid }) => !photosByFolder[folderUuid] && !failedFolders.has(folderUuid)),
    [requestedFolders, photosByFolder, failedFolders],
  );
  const isLoading = foldersToLoad.length > 0;

  const failedMonths = useMemo(
    () => [
      ...new Set(requestedFolders.filter(({ folderUuid }) => failedFolders.has(folderUuid)).map(({ key }) => key)),
    ],
    [requestedFolders, failedFolders],
  );

  const photos = useMemo(
    () => requestedFolders.flatMap(({ folderUuid }) => photosByFolder[folderUuid] ?? []),
    [requestedFolders, photosByFolder],
  );

  useEffect(() => {
    const newFolders = foldersToLoad.filter(({ folderUuid }) => !foldersBeingLoaded.current.has(folderUuid));
    if (newFolders.length === 0) return;
    newFolders.forEach(({ folderUuid }) => foldersBeingLoaded.current.add(folderUuid));

    const loadFolders = async () => {
      const results = await Promise.allSettled(
        newFolders.map((folder) => PhotoFoldersService.instance.getMonthPhotos(folder)),
      );
      const loaded: Record<string, Photo[]> = {};
      const failed: string[] = [];
      results.forEach((result, index) => {
        const { folderUuid } = newFolders[index];
        foldersBeingLoaded.current.delete(folderUuid);
        if (result.status === 'fulfilled') {
          loaded[folderUuid] = result.value;
        } else {
          errorService.reportError(result.reason);
          failed.push(folderUuid);
        }
      });

      setPhotosByFolder((current) => ({ ...current, ...loaded }));
      setFailedFolders((current) => new Set([...current, ...failed]));
      const foundNoPhotos = failed.length === 0 && Object.values(loaded).every((folderPhotos) => !folderPhotos.length);
      if (foundNoPhotos) setRequestedMonthsCount((count) => count + 1);
    };

    void loadFolders();
  }, [foldersToLoad]);

  const loadNextMonth = useCallback(() => {
    if (!isLoading && hasMoreMonths) setRequestedMonthsCount(requestedMonthsCount + 1);
  }, [isLoading, hasMoreMonths, requestedMonthsCount]);

  const retryMonths = useCallback(
    (monthsToRetry: MonthKey[]) => {
      const foldersToRetry = new Set(
        months.filter(({ key }) => monthsToRetry.includes(key)).map(({ folderUuid }) => folderUuid),
      );
      setFailedFolders((current) => new Set([...current].filter((folderUuid) => !foldersToRetry.has(folderUuid))));
    },
    [months],
  );

  return { photos, isLoading, hasMoreMonths, failedMonths, loadNextMonth, retryMonths };
};
